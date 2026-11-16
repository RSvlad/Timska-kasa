// UI: Страница за евиденцију Дугова (Потраживања и Обавезе, са отплатама).
// Само Admin може да мутира; Viewer само чита. Дугови не мењају салдо касе (ADR-0006).

import { useId, useState } from "react";
import { useDebtList } from "@finance/application/useDebtList";
import {
  addDebt,
  cancelDebt,
  debtTotalsByCurrency,
  editDebt,
  repayDebt,
} from "@finance/application/debtService";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { isSettled, remainingOf, type Debt, type DebtDirection } from "@finance/domain/Debt";
import { isValidCurrency, normalizeCurrency, parseAmountInput } from "@finance/domain/Amount";
import type { Role } from "@identity/domain/User";
import { useT } from "@shared/i18n/I18nProvider";
import { useFormatters } from "@shared/i18n/useFormatters";
import { sharedMessages } from "@shared/ui/messages";
import { DEBT_DIRECTION_KEYS, debtsMessages } from "@finance/ui/DebtsPage.messages";
import { useDebtErrorMessage } from "@finance/ui/useDebtErrorMessage";

interface Props {
  role: Role;
  currentUserId: string;
}

interface DebtForm {
  amount: string;
  currency: string;
  counterparty: string;
  description: string;
}

const EMPTY_FORM: DebtForm = { amount: "", currency: "RSD", counterparty: "", description: "" };

type ValidationKey =
  "debts.error.amount" | "debts.error.currency" | "debts.error.counterpartyRequired";

function validateForm(form: DebtForm, t: (key: ValidationKey) => string): string {
  if (!form.counterparty.trim()) return t("debts.error.counterpartyRequired");
  if (parseAmountInput(form.amount) === null) return t("debts.error.amount");
  if (!isValidCurrency(form.currency)) return t("debts.error.currency");
  return "";
}

function directionBadge(direction: DebtDirection): string {
  return direction === "Потраживање" ? "income" : "expense";
}

interface DebtCardProps {
  debt: Debt;
  isAdmin: boolean;
  currentUserId: string;
}

function DebtCard({ debt, isAdmin, currentUserId }: DebtCardProps) {
  const fmt = useFormatters();
  const t = useT(debtsMessages);
  const tShared = useT(sharedMessages);
  const debtErrorMessage = useDebtErrorMessage();
  const uid = useId();
  const [repaying, setRepaying] = useState(false);
  const [repayInput, setRepayInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<DebtForm>(EMPTY_FORM);
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const { currency } = debt.amount;
  const settled = isSettled(debt);
  const remaining = remainingOf(debt);
  const pct = debt.amount.value > 0 ? Math.min(100, (debt.paid / debt.amount.value) * 100) : 0;

  function startEdit() {
    setEditForm({
      amount: String(debt.amount.value),
      currency,
      counterparty: debt.counterparty,
      description: debt.description ?? "",
    });
    setErr("");
    setEditing(true);
  }

  async function handleRepay() {
    if (busy) return;
    const value = parseAmountInput(repayInput);
    if (value === null) {
      setErr(t("debts.error.amount"));
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await repayDebt(debt, value, currentUserId);
      setRepayInput("");
      setRepaying(false);
    } catch (e: unknown) {
      setErr(debtErrorMessage(e, "debts.error.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit() {
    if (busy) return;
    const invalid = validateForm(editForm, t);
    if (invalid) {
      setErr(invalid);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await editDebt(debt.id, {
        counterparty: editForm.counterparty.trim(),
        description: editForm.description.trim() || undefined,
        amount: {
          value: parseAmountInput(editForm.amount) as number,
          currency: normalizeCurrency(editForm.currency),
        },
      });
      setEditing(false);
    } catch (e: unknown) {
      setErr(debtErrorMessage(e, "debts.error.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmVoid() {
    if (busy) return;
    setConfirmingVoid(false);
    setBusy(true);
    try {
      await cancelDebt(debt.id);
    } catch (e: unknown) {
      setErr(debtErrorMessage(e, "debts.error.voidFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`fund-card ${settled ? "debt-card--settled" : ""}`}>
      {editing ? (
        <div className="fund-edit-form">
          <div className="form-field">
            <label className="field-label" htmlFor={`${uid}-1`}>
              {t("debts.field.counterparty")}
            </label>
            <input
              id={`${uid}-1`}
              value={editForm.counterparty}
              onChange={(e) => setEditForm({ ...editForm, counterparty: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="field-label" htmlFor={`${uid}-2`}>
              {t("debts.field.description")}{" "}
              <span className="field-optional">{t("debts.field.optional")}</span>
            </label>
            <input
              id={`${uid}-2`}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-field form-field--grow">
              <label className="field-label" htmlFor={`${uid}-3`}>
                {t("debts.field.amount")}
              </label>
              <input
                id={`${uid}-3`}
                inputMode="decimal"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
            <div className="form-field form-field--currency">
              <label className="field-label" htmlFor={`${uid}-4`}>
                {t("debts.field.currency")}
              </label>
              <input
                id={`${uid}-4`}
                maxLength={3}
                value={editForm.currency}
                onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
              />
            </div>
          </div>
          {err && <p className="error-text">{err}</p>}
          <div className="form-actions">
            <button className="primary" disabled={busy} onClick={handleEdit}>
              {t("debts.save")}
            </button>
            <button
              className="ghost"
              onClick={() => {
                setEditing(false);
                setErr("");
              }}
            >
              {tShared("confirm.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="fund-card-header">
            <div>
              <p className="fund-name">{debt.counterparty}</p>
              <span className={`badge ${directionBadge(debt.direction)}`}>
                {t(DEBT_DIRECTION_KEYS[debt.direction])}
              </span>
              {debt.description && <p className="fund-desc">{debt.description}</p>}
            </div>
            {isAdmin && (
              <div className="fund-actions">
                <button
                  className="ghost chip-action-btn"
                  aria-label={t("debts.action.edit", { name: debt.counterparty })}
                  title={t("debts.action.edit", { name: debt.counterparty })}
                  onClick={startEdit}
                >
                  ✎
                </button>
                <button
                  className="ghost chip-action-btn danger"
                  aria-label={t("debts.action.void", { name: debt.counterparty })}
                  title={t("debts.action.void", { name: debt.counterparty })}
                  onClick={() => setConfirmingVoid(true)}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="fund-amounts">
            <div className="fund-amount-row">
              <span className="fund-amount-label">{t("debts.total")}</span>
              <span className="fund-amount-val">{fmt.amount(debt.amount.value, currency)}</span>
            </div>
            <div className="fund-amount-row">
              <span className="fund-amount-label">{t("debts.paid")}</span>
              <span className="fund-amount-val">{fmt.amount(debt.paid, currency)}</span>
            </div>
            <div className="fund-amount-row">
              <span className="fund-amount-label">{t("debts.remaining")}</span>
              <span
                className={`fund-amount-val ${
                  settled ? "" : debt.direction === "Потраживање" ? "income-val" : "expense-val"
                }`}
              >
                {fmt.amount(remaining, currency)}
              </span>
            </div>
          </div>

          <div className="fund-bar-track">
            <div
              className="fund-bar-fill"
              style={{ width: `${pct}%`, background: "var(--green)" }}
            />
          </div>
          <p className="fund-pct-label">
            {settled ? t("debts.settled") : t("debts.paidPct", { pct: Math.round(pct) })}
          </p>

          {debt.repayments.length > 0 && (
            <details className="debt-history">
              <summary>
                {t("debts.history")} ({debt.repayments.length})
              </summary>
              <ul>
                {debt.repayments.map((r, i) => (
                  <li key={`${r.dateTime.getTime()}-${i}`}>
                    <span>{fmt.date(r.dateTime)}</span>
                    <span>{fmt.amount(r.value, currency)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {!repaying && err && <p className="error-text">{err}</p>}

          {isAdmin && !settled && (
            <>
              {!repaying ? (
                <div className="fund-transfer-btns">
                  <button
                    className="ghost"
                    onClick={() => {
                      setRepaying(true);
                      setErr("");
                    }}
                  >
                    {t("debts.repay")}
                  </button>
                </div>
              ) : (
                <div className="fund-transfer-form">
                  <div className="form-field">
                    <label className="field-label" htmlFor={`${uid}-5`}>
                      {t("debts.repay.label", { remaining: fmt.amount(remaining, currency) })}
                    </label>
                    <input
                      id={`${uid}-5`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={repayInput}
                      onChange={(e) => setRepayInput(e.target.value)}
                    />
                  </div>
                  {err && <p className="error-text">{err}</p>}
                  <div className="form-actions">
                    <button className="primary" disabled={busy} onClick={handleRepay}>
                      {tShared("confirm.confirm")}
                    </button>
                    <button
                      className="ghost"
                      onClick={() => {
                        setRepaying(false);
                        setRepayInput("");
                        setErr("");
                      }}
                    >
                      {tShared("confirm.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmingVoid}
        title={t("debts.void.title", { name: debt.counterparty })}
        message={t("debts.void.message")}
        confirmLabel={t("debts.void")}
        onConfirm={confirmVoid}
        onCancel={() => setConfirmingVoid(false)}
      />
    </div>
  );
}

// ── Главна компонента ──────────────────────────────────────────────────────

export function DebtsPage({ role, currentUserId }: Props) {
  const t = useT(debtsMessages);
  const fmt = useFormatters();
  const uid = useId();
  const { data: debts } = useDebtList();
  const isAdmin = role === "Admin";

  const [direction, setDirection] = useState<DebtDirection>("Потраживање");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Поништени дугови се не приказују (меко брисање); отворени иду испред измирених.
  const visible = debts
    .filter((d) => d.active)
    .sort(
      (a, b) =>
        Number(isSettled(a)) - Number(isSettled(b)) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );

  const totals = Object.entries(debtTotalsByCurrency(debts)).filter(
    ([, v]) => v.receivable > 0 || v.payable > 0,
  );

  async function handleCreate() {
    if (creating) return;
    const invalid = validateForm(form, t);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setFormError("");
    setCreating(true);
    try {
      await addDebt({
        direction,
        counterparty: form.counterparty.trim(),
        description: form.description.trim() || undefined,
        amount: {
          value: parseAmountInput(form.amount) as number,
          currency: normalizeCurrency(form.currency),
        },
        authorId: currentUserId,
      });
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch {
      setFormError(t("debts.error.saveFailed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="funds-root">
      {/* ── Збирно по валути (не улази у салдо касе) ── */}
      {totals.length > 0 && (
        <div>
          <div className="funds-grid">
            {totals.map(([currency, v]) => (
              <div className="fund-card" key={currency}>
                <p className="fund-name">
                  {t("debts.summary.title")} · {currency}
                </p>
                <div className="fund-amounts">
                  <div className="fund-amount-row">
                    <span className="fund-amount-label">{t("debts.summary.receivable")}</span>
                    <span className="fund-amount-val income-val">
                      {fmt.amount(v.receivable, currency)}
                    </span>
                  </div>
                  <div className="fund-amount-row">
                    <span className="fund-amount-label">{t("debts.summary.payable")}</span>
                    <span className="fund-amount-val expense-val">
                      {fmt.amount(v.payable, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="debts-summary-note">{t("debts.summary.note")}</p>
        </div>
      )}

      {/* ── Форма за унос (само Admin) ── */}
      {isAdmin && (
        <div className="card mb-16">
          <button
            className={`form-toggle ${open ? "open" : ""}`}
            onClick={() => {
              setOpen((v) => !v);
              if (open) {
                setForm(EMPTY_FORM);
                setFormError("");
              }
            }}
          >
            <span>{open ? t("debts.close") : t("debts.new")}</span>
          </button>
          {open && (
            <div>
              <div className="form-type-row">
                {(["Потраживање", "Обавеза"] as DebtDirection[]).map((kind) => (
                  <button
                    key={kind}
                    className={`type-btn ${
                      direction === kind
                        ? kind === "Потраживање"
                          ? "income-active"
                          : "expense-active"
                        : ""
                    }`}
                    onClick={() => setDirection(kind)}
                  >
                    {`${kind === "Потраживање" ? "↑" : "↓"} ${t(DEBT_DIRECTION_KEYS[kind])}`}
                  </button>
                ))}
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-1`}>
                  {t("debts.field.counterparty")}
                </label>
                <input
                  id={`${uid}-1`}
                  placeholder={t("debts.placeholder.counterparty")}
                  value={form.counterparty}
                  onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-field form-field--grow">
                  <label className="field-label" htmlFor={`${uid}-2`}>
                    {t("debts.field.amount")}
                  </label>
                  <input
                    id={`${uid}-2`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="form-field form-field--currency">
                  <label className="field-label" htmlFor={`${uid}-3`}>
                    {t("debts.field.currency")}
                  </label>
                  <input
                    id={`${uid}-3`}
                    placeholder="RSD"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-4`}>
                  {t("debts.field.description")}{" "}
                  <span className="field-optional">{t("debts.field.optional")}</span>
                </label>
                <input
                  id={`${uid}-4`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              {formError && <p className="error-text">{formError}</p>}
              <div className="form-actions">
                <button className="primary" disabled={creating} onClick={handleCreate}>
                  {t("debts.create")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Листа дугова ── */}
      {visible.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⚖️</span>
          <p>{isAdmin ? t("debts.emptyAdmin") : t("debts.empty")}</p>
        </div>
      ) : (
        <div className="funds-grid">
          {visible.map((d) => (
            <DebtCard key={d.id} debt={d} isAdmin={isAdmin} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
