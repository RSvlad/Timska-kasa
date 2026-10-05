// UI: Листа финансијских записа са формом за унос/измену (само Admin).

import { useId, useRef, useState } from "react";
import {
  createFinanceRecord,
  updateFinanceRecord,
  type NewFinanceRecord,
} from "@finance/infrastructure/FinanceRecordRepository";
import { useRecordList } from "@finance/application/useRecordList";
import { useCategoryList } from "@finance/application/useCategoryList";
import { useFundList } from "@finance/application/useFundList";
import { useReceiptUpload } from "@finance/application/useReceiptUpload";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { RecordType } from "@finance/domain/Category";
import { isValidCurrency, normalizeCurrency, parseAmountInput } from "@finance/domain/Amount";
import type { Role } from "@identity/domain/User";

interface Props {
  role: Role;
  currentUserId: string;
}

// Форматира Date у локално "YYYY-MM-DDTHH:mm" (формат за datetime-local).
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function emptyForm() {
  return {
    type: "Приход" as RecordType,
    value: "",
    currency: "RSD",
    dateTime: toLocalInput(new Date()),
    categoryId: "",
    counterparty: "",
    description: "",
    fundId: "",
  };
}

export function RecordList({ role, currentUserId }: Props) {
  const uid = useId();
  const { data: records }    = useRecordList();
  const { data: categories } = useCategoryList();
  const { data: funds }      = useFundList();
  const isAdmin    = role === "Admin";

  const [form,      setForm]      = useState(emptyForm);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [open,      setOpen]      = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptUpload = useReceiptUpload();

  const activeCategories   = categories.filter((c) => c.active);
  const filteredCategories = activeCategories.filter((c) => c.type === form.type);

  // Фондови који имају исту валуту као унети износ
  const compatibleFunds = funds.filter(
    (f) => f.capacity.currency === normalizeCurrency(form.currency)
  );

  function categoryName(id: string): string {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return id;
    return cat.active ? cat.name : `${cat.name} (деактивирана)`;
  }

  function fundName(id: string): string {
    return funds.find((f) => f.id === id)?.name ?? "";
  }

  function validate(): string {
    if (parseAmountInput(form.value) === null)
      return "Износ мора бити позитиван број (највише 2 децимале).";
    if (!isValidCurrency(form.currency)) return "Валута мора бити важећа шифра од 3 слова (нпр. RSD, EUR).";
    if (!form.categoryId)          return "Категорија је обавезна.";
    if (!form.counterparty.trim()) return "Контрагент је обавезан.";
    return "";
  }

  async function handleSubmit() {
    if (submitting) return;
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError("");

    const payload = {
      type:         form.type,
      amount:       { value: parseAmountInput(form.value) as number, currency: normalizeCurrency(form.currency) },
      dateTime:     new Date(form.dateTime),
      categoryId:   form.categoryId,
      counterparty: form.counterparty.trim(),
      description:  form.description.trim() || undefined,
      authorId:     currentUserId,
      fundId:       form.fundId || undefined,
    };

    setSubmitting(true);
    try {
      // 1) Чување записа.
      let recordId: string;
      try {
        recordId = await saveRecord(payload);
      } catch {
        setFormError("Запис није сачуван. Провери везу и покушај поново.");
        return;
      }

      // 2) Рачун (опционо). Запис је већ сачуван: при грешци прелазимо у режим
      //    измене тог записа, па поновни покушај не прави дупликат.
      if (pendingReceipt) {
        const previousUrl = records.find((r) => r.id === recordId)?.receiptUrl;
        try {
          await receiptUpload.attachReceipt(recordId, pendingReceipt, previousUrl);
        } catch {
          setEditId(recordId);
          setFormError("Запис је сачуван, али рачун није отпремљен. Покушај поново да сачуваш измене.");
          return;
        }
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  }

  /** Креира или ажурира запис (без рачуна) и враћа његов ID. */
  async function saveRecord(payload: NewFinanceRecord): Promise<string> {
    if (editId) {
      const { authorId: _authorId, ...editable } = payload;
      await updateFinanceRecord(editId, editable);
      return editId;
    }
    return createFinanceRecord(payload);
  }

  function resetForm() {
    setEditId(null);
    setForm(emptyForm());
    setPendingReceipt(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(false);
  }

  function startEdit(r: FinanceRecord) {
    setEditId(r.id);
    setForm({
      type:         r.type,
      value:        String(r.amount.value),
      currency:     r.amount.currency,
      dateTime:     toLocalInput(r.dateTime),
      categoryId:   r.categoryId,
      counterparty: r.counterparty,
      description:  r.description ?? "",
      fundId:       r.fundId ?? "",
    });
    setPendingReceipt(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(true);
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm());
    setFormError("");
    setPendingReceipt(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(false);
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPendingReceipt(file ?? null);
  }

  async function handleRemoveExistingReceipt() {
    if (!editId) return;
    await receiptUpload.removeReceipt(editId);
  }

  const sorted = [...records].sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());

  return (
    <div className="rl-root">

      {/* ── Форма (само Admin) ── */}
      {isAdmin && (
        <div className="card">
          <button
            className={`form-toggle ${open ? "open" : ""}`}
            onClick={() => {
              if (open) { cancelEdit(); return; }
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            <span>{open ? "✕  Затвори" : "+ Нови запис"}</span>
          </button>

          {open && (
            <div className="record-form">

              {/* Ред 1: тип */}
              <div className="form-type-row">
                {(["Приход", "Расход"] as RecordType[]).map((t) => (
                  <button
                    key={t}
                    className={`type-btn ${form.type === t ? (t === "Приход" ? "income-active" : "expense-active") : ""}`}
                    onClick={() => setForm({ ...form, type: t, categoryId: "" })}
                  >
                    {t === "Приход" ? "↑ Приход" : "↓ Расход"}
                  </button>
                ))}
              </div>

              {/* Ред 2: износ + валута */}
              <div className="form-row">
                <div className="form-field form-field--grow">
                  <label className="field-label" htmlFor={`${uid}-1`}>Износ</label>
                  <input id={`${uid}-1`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </div>
                <div className="form-field form-field--currency">
                  <label className="field-label" htmlFor={`${uid}-2`}>Валута</label>
                  <input id={`${uid}-2`}
                    placeholder="RSD"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => {
                      const currency = e.target.value;
                      const fund = funds.find((f) => f.id === form.fundId);
                      const keepFund = fund && fund.capacity.currency === normalizeCurrency(currency);
                      setForm({ ...form, currency, fundId: keepFund ? form.fundId : "" });
                    }}
                  />
                </div>
              </div>

              {/* Ред 3: категорија */}
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-3`}>Категорија</label>
                <select id={`${uid}-3`}
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">— Одабери —</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Ред 4а: датум */}
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-4`}>Датум и време</label>
                <input id={`${uid}-4`}
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                />
              </div>

              {/* Ред 5: контрагент */}
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-5`}>Контрагент</label>
                <input id={`${uid}-5`}
                  placeholder="Нпр. Прометеј д.о.о."
                  value={form.counterparty}
                  onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                />
              </div>

              {/* Ред 5: фонд (опционо — само ако постоје компатибилни фондови) */}
              {compatibleFunds.length > 0 && (
                <div className="form-field">
                  <label className="field-label" htmlFor={`${uid}-6`}>
                    Фонд <span className="field-optional">(опционо — терети фонд уместо касе)</span>
                  </label>
                  <select id={`${uid}-6`}
                    value={form.fundId}
                    onChange={(e) => setForm({ ...form, fundId: e.target.value })}
                  >
                    <option value="">— Тимска каса —</option>
                    {compatibleFunds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.reserved.toLocaleString("sr-RS")} / {f.capacity.value.toLocaleString("sr-RS")} {f.capacity.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ред 6: опис */}
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-7`}>Опис <span className="field-optional">(опционо)</span></label>
                <input id={`${uid}-7`}
                  placeholder=""
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Рачун — опциона слика */}
              <div className="form-field">
                <label className="field-label">Рачун <span className="field-optional">(опционо)</span></label>

                {editId && !pendingReceipt && (() => {
                  const existingUrl = records.find((r) => r.id === editId)?.receiptUrl;
                  return existingUrl ? (
                    <div className="receipt-preview">
                      <a href={existingUrl} target="_blank" rel="noreferrer">
                        <img src={existingUrl} alt="Рачун" className="receipt-thumb" />
                      </a>
                      <button
                        type="button"
                        className="ghost"
                        disabled={receiptUpload.uploading}
                        onClick={handleRemoveExistingReceipt}
                      >
                        Уклони рачун
                      </button>
                    </div>
                  ) : null;
                })()}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handleReceiptChange}
                  className="file-input-hidden"
                  id="receipt-file-input"
                />
                <label htmlFor="receipt-file-input" className="file-picker-btn">
                  <span className="file-picker-icon">🧾</span>
                  <span>{pendingReceipt ? "Промени слику" : "Изабери слику"}</span>
                </label>

                {pendingReceipt && (
                  <p className="receipt-pending">Одабрано: {pendingReceipt.name}</p>
                )}
                {receiptUpload.uploading && (
                  <p className="receipt-pending">Отпремање рачуна…</p>
                )}
                {receiptUpload.error && (
                  <p className="error-text">{receiptUpload.error}</p>
                )}
              </div>

              {formError && <p className="error-text">{formError}</p>}

              <div className="form-actions">
                <button className="primary" disabled={submitting} onClick={handleSubmit}>
                  {editId ? "Сачувај измене" : "Додај запис"}
                </button>
                {editId && (
                  <button className="ghost" disabled={submitting} onClick={cancelEdit}>Откажи</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Листа записа ── */}
      <div className="card">
        <p className="section-title">Сви записи</p>
        {sorted.length === 0 ? (
          <p className="empty-inline">Нема записа.</p>
        ) : (
          <div className="record-list">
            {sorted.map((r) => {
              const isIncome = r.type === "Приход";
              return (
                <div key={r.id} className="record-item">
                  <div className={`recent-icon ${isIncome ? "income-icon" : "expense-icon"}`}>
                    {isIncome ? "↑" : "↓"}
                  </div>
                  <div className="record-meta">
                    <span className="recent-counterparty">{r.counterparty}</span>
                    <span className="recent-cat">
                      {categoryName(r.categoryId)}
                      {r.fundId && <> · <span style={{ color: "var(--accent)" }}>📁 {fundName(r.fundId)}</span></>}
                      {r.receiptUrl && (
                        <> · <a href={r.receiptUrl} target="_blank" rel="noreferrer">🧾 рачун</a></>
                      )}
                      {r.description && <> · {r.description}</>}
                    </span>
                    <span className="recent-time">
                      {r.dateTime.toLocaleString("sr-RS")}
                    </span>
                  </div>
                  <div className="record-right">
                    <span className={`recent-amount ${isIncome ? "income-val" : "expense-val"}`}>
                      {isIncome ? "+" : "−"}{r.amount.value.toLocaleString("sr-RS")} {r.amount.currency}
                    </span>
                    {isAdmin && (
                      <button className="ghost edit-btn" onClick={() => startEdit(r)}>Уреди</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
