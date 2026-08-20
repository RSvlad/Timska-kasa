// UI: Листа финансијских записа са формом за унос/измену (само Admin).

import { useRef, useState } from "react";
import {
  createFinanceRecord,
  updateFinanceRecord,
} from "@finance/infrastructure/FinanceRecordRepository";
import { useRecordList } from "@finance/application/useRecordList";
import { useCategoryList } from "@finance/application/useCategoryList";
import { useFundList } from "@finance/application/useFundList";
import { useReceiptUpload } from "@finance/application/useReceiptUpload";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { RecordType } from "@finance/domain/Category";
import type { Role } from "@identity/domain/User";

interface Props {
  role: Role;
  currentUserId: string;
}

const EMPTY_FORM = {
  type: "Приход" as RecordType,
  value: "",
  currency: "RSD",
  dateTime: new Date().toISOString().slice(0, 16),
  categoryId: "",
  counterparty: "",
  description: "",
  fundId: "",
};

export function RecordList({ role, currentUserId }: Props) {
  const records    = useRecordList();
  const categories = useCategoryList();
  const funds      = useFundList();
  const isAdmin    = role === "Admin";

  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [open,      setOpen]      = useState(false);

  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptUpload = useReceiptUpload();

  const activeCategories   = categories.filter((c) => c.active);
  const filteredCategories = activeCategories.filter((c) => c.type === form.type);

  // Фондови који имају исту валуту као унети износ
  const compatibleFunds = funds.filter(
    (f) => f.capacity.currency === form.currency.trim().toUpperCase()
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
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)
      return "Износ мора бити позитиван број.";
    if (!form.currency.trim())     return "Валута је обавезна.";
    if (!form.categoryId)          return "Категорија је обавезна.";
    if (!form.counterparty.trim()) return "Контрагент је обавезан.";
    return "";
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError("");

    const payload = {
      type:         form.type,
      amount:       { value: Number(form.value), currency: form.currency.trim().toUpperCase() },
      dateTime:     new Date(form.dateTime),
      categoryId:   form.categoryId,
      counterparty: form.counterparty.trim(),
      description:  form.description.trim() || undefined,
      authorId:     currentUserId,
      fundId:       form.fundId || undefined,
    };

    if (editId) {
      await updateFinanceRecord(editId, {
        type:         payload.type,
        amount:       payload.amount,
        dateTime:     payload.dateTime,
        categoryId:   payload.categoryId,
        counterparty: payload.counterparty,
        description:  payload.description,
        fundId:       payload.fundId,
      });
      if (pendingReceipt) {
        const existing = records.find((r) => r.id === editId);
        await receiptUpload.attachReceipt(editId, pendingReceipt, existing?.receiptUrl);
      }
      setEditId(null);
    } else {
      const newId = await createFinanceRecord(payload);
      if (pendingReceipt) {
        await receiptUpload.attachReceipt(newId, pendingReceipt);
      }
    }
    setForm(EMPTY_FORM);
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
      dateTime:     r.dateTime.toISOString().slice(0, 16),
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
    setForm(EMPTY_FORM);
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
            onClick={() => { setOpen((v) => !v); if (open) cancelEdit(); }}
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
                  <label className="field-label">Износ</label>
                  <input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value, fundId: "" })}
                  />
                </div>
                <div className="form-field form-field--currency">
                  <label className="field-label">Валута</label>
                  <input
                    placeholder="RSD"
                    maxLength={5}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value, fundId: "" })}
                  />
                </div>
              </div>

              {/* Ред 3: категорија */}
              <div className="form-field">
                <label className="field-label">Категорија</label>
                <select
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
                <label className="field-label">Датум и време</label>
                <input
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                />
              </div>

              {/* Ред 5: контрагент */}
              <div className="form-field">
                <label className="field-label">Контрагент</label>
                <input
                  placeholder="Нпр. Прометеј д.о.о."
                  value={form.counterparty}
                  onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                />
              </div>

              {/* Ред 5: фонд (опционо — само ако постоје компатибилни фондови) */}
              {compatibleFunds.length > 0 && (
                <div className="form-field">
                  <label className="field-label">
                    Фонд <span className="field-optional">(опционо — терети фонд уместо касе)</span>
                  </label>
                  <select
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
                <label className="field-label">Опис <span className="field-optional">(опционо)</span></label>
                <input
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
                <button className="primary" onClick={handleSubmit}>
                  {editId ? "Сачувај измене" : "Додај запис"}
                </button>
                {editId && (
                  <button className="ghost" onClick={cancelEdit}>Откажи</button>
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
