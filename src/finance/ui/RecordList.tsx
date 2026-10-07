// UI: Листа финансијских записа са формом за унос/измену (само Admin).

import { useId, useRef, useState } from "react";
import {
  addRecord,
  editRecord,
  FundChargeError,
  type NewFinanceRecord,
} from "@finance/application/recordService";
import { useRecordList } from "@finance/application/useRecordList";
import { useCategoryList } from "@finance/application/useCategoryList";
import { useCategoryLabel } from "@finance/application/useCategoryLabel";
import { useFundList } from "@finance/application/useFundList";
import { useReceiptUpload } from "@finance/application/useReceiptUpload";
import { openReceipt, receiptSource, useReceiptUrl } from "@finance/application/receiptAccess";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { RecordType } from "@finance/domain/Category";
import { isValidCurrency, normalizeCurrency, parseAmountInput } from "@finance/domain/Amount";
import type { Role } from "@identity/domain/User";
import { useT } from "@shared/i18n/I18nProvider";
import { useFormatters } from "@shared/i18n/useFormatters";
import { recordsMessages } from "@finance/ui/RecordList.messages";
import { financeMessages, RECORD_TYPE_KEYS } from "@finance/ui/finance.messages";
import {
  useFundChargeErrorMessage,
  useReceiptErrorMessage,
} from "@finance/ui/useRecordErrorMessages";

interface Props {
  role: Role;
  currentUserId: string;
}

/** Умањена слика рачуна (URL се добија на захтев). HEIC већина прегледача не приказује: уместо покварене слике остаје текст (линк је око њега). */
function ReceiptThumb({ source }: { source: string }) {
  const t = useT(recordsMessages);
  const url = useReceiptUrl(source);
  const [failed, setFailed] = useState(false);
  if (failed || !url) return <span>{t("records.receipt.open")}</span>;
  return (
    <img
      src={url}
      alt={t("records.receipt.alt")}
      className="receipt-thumb"
      onError={() => setFailed(true)}
    />
  );
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
  const fmt = useFormatters();
  const t = useT(recordsMessages);
  const tf = useT(financeMessages);
  const labelOf = useCategoryLabel();
  const fundChargeMessage = useFundChargeErrorMessage();
  const receiptMessage = useReceiptErrorMessage();
  const uid = useId();
  const { data: records } = useRecordList();
  const { data: categories } = useCategoryList();
  const { data: funds } = useFundList();
  const isAdmin = role === "Admin";

  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptUpload = useReceiptUpload();

  const activeCategories = categories.filter((c) => c.active);
  const filteredCategories = activeCategories.filter((c) => c.type === form.type);

  // Фондови који имају исту валуту као унети износ
  const compatibleFunds = funds.filter(
    (f) => f.capacity.currency === normalizeCurrency(form.currency),
  );

  function categoryName(id: string): string {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return id;
    const label = labelOf(cat);
    return cat.active ? label : t("records.category.inactive", { name: label });
  }

  function fundName(id: string): string {
    return funds.find((f) => f.id === id)?.name ?? "";
  }

  function validate(): string {
    if (parseAmountInput(form.value) === null) return t("records.error.amount");
    if (!isValidCurrency(form.currency)) return t("records.error.currency");
    if (!form.categoryId) return t("records.error.categoryRequired");
    if (!form.counterparty.trim()) return t("records.error.counterpartyRequired");
    return "";
  }

  async function handleSubmit() {
    if (submitting) return;
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");

    const payload = {
      type: form.type,
      amount: {
        value: parseAmountInput(form.value) as number,
        currency: normalizeCurrency(form.currency),
      },
      dateTime: new Date(form.dateTime),
      categoryId: form.categoryId,
      counterparty: form.counterparty.trim(),
      description: form.description.trim() || undefined,
      authorId: currentUserId,
      fundId: form.fundId || undefined,
    };

    setSubmitting(true);
    try {
      // 1) Чување записа.
      let recordId: string;
      try {
        recordId = await saveRecord(payload);
      } catch (e) {
        setFormError(
          e instanceof FundChargeError
            ? fundChargeMessage(e.detail)
            : t("records.error.saveFailed"),
        );
        return;
      }

      // 2) Рачун (опционо). Запис је већ сачуван: при грешци прелазимо у режим
      //    измене тог записа, па поновни покушај не прави дупликат.
      if (pendingReceipt) {
        const existing = records.find((r) => r.id === recordId);
        const hadPrevious = !!existing && !!receiptSource(existing);
        try {
          await receiptUpload.attachReceipt(recordId, pendingReceipt, hadPrevious);
        } catch {
          setEditId(recordId);
          setFormError(t("records.error.receiptFailed"));
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
      await editRecord(editId, editable);
      return editId;
    }
    return addRecord(payload);
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
      type: r.type,
      value: String(r.amount.value),
      currency: r.amount.currency,
      dateTime: toLocalInput(r.dateTime),
      categoryId: r.categoryId,
      counterparty: r.counterparty,
      description: r.description ?? "",
      fundId: r.fundId ?? "",
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

  function handleOpenReceipt(e: React.MouseEvent, source: string) {
    e.preventDefault();
    setReceiptError("");
    openReceipt(source).catch(() => setReceiptError(t("records.error.receipt.openFailed")));
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
              if (open) {
                cancelEdit();
                return;
              }
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            <span>{open ? t("records.close") : t("records.new")}</span>
          </button>

          {open && (
            <div className="record-form">
              {/* Ред 1: тип */}
              <div className="form-type-row">
                {(["Приход", "Расход"] as RecordType[]).map((kind) => (
                  <button
                    key={kind}
                    className={`type-btn ${form.type === kind ? (kind === "Приход" ? "income-active" : "expense-active") : ""}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        type: kind,
                        categoryId: "",
                        fundId: kind === "Расход" ? form.fundId : "",
                      })
                    }
                  >
                    {`${kind === "Приход" ? "↑" : "↓"} ${tf(RECORD_TYPE_KEYS[kind])}`}
                  </button>
                ))}
              </div>

              {/* Ред 2: износ + валута */}
              <div className="form-row">
                <div className="form-field form-field--grow">
                  <label className="field-label" htmlFor={`${uid}-1`}>
                    {t("records.field.amount")}
                  </label>
                  <input
                    id={`${uid}-1`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </div>
                <div className="form-field form-field--currency">
                  <label className="field-label" htmlFor={`${uid}-2`}>
                    {t("records.field.currency")}
                  </label>
                  <input
                    id={`${uid}-2`}
                    placeholder="RSD"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => {
                      const currency = e.target.value;
                      const fund = funds.find((f) => f.id === form.fundId);
                      const keepFund =
                        fund && fund.capacity.currency === normalizeCurrency(currency);
                      setForm({ ...form, currency, fundId: keepFund ? form.fundId : "" });
                    }}
                  />
                </div>
              </div>

              {/* Ред 3: категорија */}
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-3`}>
                  {t("records.field.category")}
                </label>
                <select
                  id={`${uid}-3`}
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">{t("records.select.choose")}</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {labelOf(c)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ред 4а: датум */}
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-4`}>
                  {t("records.field.dateTime")}
                </label>
                <input
                  id={`${uid}-4`}
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                />
              </div>

              {/* Ред 5: контрагент */}
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-5`}>
                  {t("records.field.counterparty")}
                </label>
                <input
                  id={`${uid}-5`}
                  placeholder={t("records.placeholder.counterparty")}
                  value={form.counterparty}
                  onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                />
              </div>

              {/* Ред 5: фонд (опционо — само ако постоје компатибилни фондови) */}
              {form.type === "Расход" && compatibleFunds.length > 0 && (
                <div className="form-field">
                  <label className="field-label" htmlFor={`${uid}-6`}>
                    {t("records.field.fund")}{" "}
                    <span className="field-optional">{t("records.field.fundHint")}</span>
                  </label>
                  <select
                    id={`${uid}-6`}
                    value={form.fundId}
                    onChange={(e) => setForm({ ...form, fundId: e.target.value })}
                  >
                    <option value="">{t("records.select.teamFund")}</option>
                    {compatibleFunds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({fmt.number(f.reserved)} / {fmt.number(f.capacity.value)}{" "}
                        {f.capacity.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ред 6: опис */}
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-7`}>
                  {t("records.field.description")}{" "}
                  <span className="field-optional">{t("records.field.optional")}</span>
                </label>
                <input
                  id={`${uid}-7`}
                  placeholder=""
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Рачун — опциона слика */}
              <div className="form-field">
                <label className="field-label">
                  {t("records.field.receipt")}{" "}
                  <span className="field-optional">{t("records.field.optional")}</span>
                </label>

                {editId &&
                  !pendingReceipt &&
                  (() => {
                    const existing = records.find((r) => r.id === editId);
                    const existingSource = existing ? receiptSource(existing) : undefined;
                    return existingSource ? (
                      <div className="receipt-preview">
                        <a href="#" onClick={(e) => handleOpenReceipt(e, existingSource)}>
                          <ReceiptThumb source={existingSource} />
                        </a>
                        <button
                          type="button"
                          className="ghost"
                          disabled={receiptUpload.uploading}
                          onClick={handleRemoveExistingReceipt}
                        >
                          {t("records.receipt.remove")}
                        </button>
                      </div>
                    ) : null;
                  })()}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  onChange={handleReceiptChange}
                  className="file-input-hidden"
                  id="receipt-file-input"
                />
                <label htmlFor="receipt-file-input" className="file-picker-btn">
                  <span className="file-picker-icon">🧾</span>
                  <span>
                    {pendingReceipt ? t("records.receipt.change") : t("records.receipt.choose")}
                  </span>
                </label>

                {pendingReceipt && (
                  <p className="receipt-pending">
                    {t("records.receipt.selected", { name: pendingReceipt.name })}
                  </p>
                )}
                {receiptUpload.uploading && (
                  <p className="receipt-pending">{t("records.receipt.uploading")}</p>
                )}
                {receiptUpload.error && (
                  <p className="error-text">{receiptMessage(receiptUpload.error)}</p>
                )}
              </div>

              {formError && <p className="error-text">{formError}</p>}

              <div className="form-actions">
                <button className="primary" disabled={submitting} onClick={handleSubmit}>
                  {editId ? t("records.save") : t("records.add")}
                </button>
                {editId && (
                  <button className="ghost" disabled={submitting} onClick={cancelEdit}>
                    {t("records.cancel")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Листа записа ── */}
      <div className="card">
        <p className="section-title">{t("records.title")}</p>
        {receiptError && <p className="error-text">{receiptError}</p>}
        {sorted.length === 0 ? (
          <p className="empty-inline">{t("records.empty")}</p>
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
                      {r.fundId && (
                        <>
                          {" "}
                          · <span style={{ color: "var(--accent)" }}>📁 {fundName(r.fundId)}</span>
                        </>
                      )}
                      {receiptSource(r) && (
                        <>
                          {" "}
                          ·{" "}
                          <a href="#" onClick={(e) => handleOpenReceipt(e, receiptSource(r)!)}>
                            {t("records.receipt.link")}
                          </a>
                        </>
                      )}
                      {r.description && <> · {r.description}</>}
                    </span>
                    <span className="recent-time">{fmt.dateTime(r.dateTime)}</span>
                  </div>
                  <div className="record-right">
                    <span className={`recent-amount ${isIncome ? "income-val" : "expense-val"}`}>
                      {isIncome ? "+" : "−"}
                      {fmt.number(r.amount.value)} {r.amount.currency}
                    </span>
                    {isAdmin && (
                      <button className="ghost edit-btn" onClick={() => startEdit(r)}>
                        {t("records.edit")}
                      </button>
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
