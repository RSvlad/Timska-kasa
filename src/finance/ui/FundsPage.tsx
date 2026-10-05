// UI: Страница за управљање Фондовима (CRUD + алокација/дезалокација).
// Само Admin може да мутира; Viewer само чита.

import { useId, useState } from "react";
import { useFundList } from "@finance/application/useFundList";
import { useRecordList } from "@finance/application/useRecordList";
import {
  addFund,
  editFund,
  removeFund,
  reserveIntoFund,
  releaseFromFund,
  freeBalanceByCurrency,
} from "@finance/application/fundService";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import type { Fund } from "@finance/domain/Fund";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import {
  formatAmount,
  isValidCurrency,
  normalizeCurrency,
  parseAmountInput,
  toMinor,
  fromMinor,
} from "@finance/domain/Amount";
import type { Role } from "@identity/domain/User";

interface Props {
  role: Role;
}

const EMPTY_FORM = { name: "", description: "", capacity: "", currency: "RSD" };

const fmt = formatAmount;

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= 90 ? "var(--red)" : clamped >= 60 ? "var(--accent)" : "var(--green)";
  return (
    <div className="fund-bar-track">
      <div className="fund-bar-fill" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

interface FundCardProps {
  fund: Fund;
  isAdmin: boolean;
  freeInCurrency: number;
  allFunds: Fund[];
  records: FinanceRecord[];
}

function FundCard({ fund, isAdmin, freeInCurrency, allFunds, records }: FundCardProps) {
  const uid = useId();
  const [deltaInput, setDeltaInput] = useState("");
  const [mode, setMode] = useState<"reserve" | "release" | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: fund.name,
    description: fund.description ?? "",
    capacity: String(fund.capacity.value),
    currency: fund.capacity.currency,
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const pct = fund.capacity.value > 0 ? (fund.reserved / fund.capacity.value) * 100 : 0;
  const available = fromMinor(toMinor(fund.capacity.value) - toMinor(fund.reserved));

  async function handleTransfer() {
    if (busy) return;
    const delta = parseAmountInput(deltaInput);
    if (delta === null) {
      setErr("Унеси позитиван износ (највише 2 децимале).");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      if (mode === "reserve") {
        await reserveIntoFund(fund, delta, records, allFunds);
      } else {
        await releaseFromFund(fund, delta);
      }
      setDeltaInput("");
      setMode(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Грешка.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit() {
    if (busy) return;
    const cap = parseAmountInput(editForm.capacity);
    if (!editForm.name.trim()) {
      setErr("Назив је обавезан.");
      return;
    }
    if (cap === null) {
      setErr("Капацитет мора бити позитиван број (највише 2 децимале).");
      return;
    }
    if (!isValidCurrency(editForm.currency)) {
      setErr("Валута мора бити важећа шифра од 3 слова (нпр. RSD, EUR).");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await editFund(fund.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        capacity: { value: cap, currency: normalizeCurrency(editForm.currency) },
      });
      setEditing(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Грешка.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (busy) return;
    setConfirmingDelete(false);
    setBusy(true);
    try {
      await removeFund(fund, records);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Фонд није обрисан. Провери везу и покушај поново.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fund-card">
      {editing ? (
        <div className="fund-edit-form">
          <div className="form-field">
            <label className="field-label" htmlFor={`${uid}-1`}>
              Назив
            </label>
            <input
              id={`${uid}-1`}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="field-label" htmlFor={`${uid}-2`}>
              Опис <span className="field-optional">(опционо)</span>
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
                Капацитет
              </label>
              <input
                id={`${uid}-3`}
                inputMode="decimal"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
              />
            </div>
            <div className="form-field form-field--currency">
              <label className="field-label" htmlFor={`${uid}-4`}>
                Валута
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
              Сачувај
            </button>
            <button
              className="ghost"
              onClick={() => {
                setEditing(false);
                setErr("");
              }}
            >
              Откажи
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="fund-card-header">
            <div>
              <p className="fund-name">{fund.name}</p>
              {fund.description && <p className="fund-desc">{fund.description}</p>}
            </div>
            {isAdmin && (
              <div className="fund-actions">
                <button
                  className="ghost chip-action-btn"
                  onClick={() => {
                    setEditing(true);
                    setErr("");
                  }}
                >
                  ✎
                </button>
                <button
                  className="ghost chip-action-btn danger"
                  onClick={() => setConfirmingDelete(true)}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="fund-amounts">
            <div className="fund-amount-row">
              <span className="fund-amount-label">Алоцирано</span>
              <span className="fund-amount-val">{fmt(fund.reserved, fund.capacity.currency)}</span>
            </div>
            <div className="fund-amount-row">
              <span className="fund-amount-label">Капацитет</span>
              <span className="fund-amount-val">
                {fmt(fund.capacity.value, fund.capacity.currency)}
              </span>
            </div>
            <div className="fund-amount-row">
              <span className="fund-amount-label">Слободно у фонду</span>
              <span className="fund-amount-val income-val">
                {fmt(available, fund.capacity.currency)}
              </span>
            </div>
          </div>

          <ProgressBar pct={pct} />
          <p className="fund-pct-label">{Math.round(pct)}% попуњено</p>
          {mode === null && err && <p className="error-text">{err}</p>}

          {isAdmin && (
            <>
              {mode === null ? (
                <div className="fund-transfer-btns">
                  <button
                    className="ghost"
                    onClick={() => {
                      setMode("reserve");
                      setErr("");
                    }}
                    disabled={freeInCurrency <= 0 || available <= 0}
                  >
                    + Алоцирај
                  </button>
                  <button
                    className="ghost"
                    onClick={() => {
                      setMode("release");
                      setErr("");
                    }}
                    disabled={fund.reserved <= 0}
                  >
                    − Дезалоцирај
                  </button>
                </div>
              ) : (
                <div className="fund-transfer-form">
                  <div className="form-row">
                    <div className="form-field form-field--grow">
                      <label className="field-label" htmlFor={`${uid}-5`}>
                        {mode === "reserve"
                          ? `Алоцирај (слободно у тимској каси: ${freeInCurrency.toLocaleString("sr-RS")} ${fund.capacity.currency})`
                          : "Дезалоцирај"}
                      </label>
                      <input
                        id={`${uid}-5`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={deltaInput}
                        onChange={(e) => setDeltaInput(e.target.value)}
                      />
                    </div>
                  </div>
                  {err && <p className="error-text">{err}</p>}
                  <div className="form-actions">
                    <button className="primary" disabled={busy} onClick={handleTransfer}>
                      Потврди
                    </button>
                    <button
                      className="ghost"
                      onClick={() => {
                        setMode(null);
                        setDeltaInput("");
                        setErr("");
                      }}
                    >
                      Откажи
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title={`Обриши фонд „${fund.name}“?`}
        message="Ова акција је трајна."
        confirmLabel="Обриши"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

// ── Главна компонента ──────────────────────────────────────────────────────

export function FundsPage({ role }: Props) {
  const uid = useId();
  const { data: funds } = useFundList();
  const { data: records } = useRecordList();
  const isAdmin = role === "Admin";

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const freeBalance = freeBalanceByCurrency(records, funds);

  function validate(): string {
    if (!form.name.trim()) return "Назив је обавезан.";
    if (parseAmountInput(form.capacity) === null)
      return "Капацитет мора бити позитиван број (највише 2 децимале).";
    if (!isValidCurrency(form.currency))
      return "Валута мора бити важећа шифра од 3 слова (нпр. RSD, EUR).";
    return "";
  }

  async function handleCreate() {
    if (creating) return;
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    setCreating(true);
    try {
      await addFund({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        capacity: {
          value: parseAmountInput(form.capacity) as number,
          currency: normalizeCurrency(form.currency),
        },
      });
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch {
      setFormError("Фонд није сачуван. Провери везу и покушај поново.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="funds-root">
      {/* ── Форма за креирање (само Admin) ── */}
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
            <span>{open ? "✕  Затвори" : "+ Нови фонд"}</span>
          </button>
          {open && (
            <div>
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-6`}>
                  Назив
                </label>
                <input
                  id={`${uid}-6`}
                  placeholder="Нпр. Путни трошкови"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor={`${uid}-7`}>
                  Опис <span className="field-optional">(опционо)</span>
                </label>
                <input
                  id={`${uid}-7`}
                  placeholder=""
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-field form-field--grow">
                  <label className="field-label" htmlFor={`${uid}-8`}>
                    Капацитет
                  </label>
                  <input
                    id={`${uid}-8`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  />
                </div>
                <div className="form-field form-field--currency">
                  <label className="field-label" htmlFor={`${uid}-9`}>
                    Валута
                  </label>
                  <input
                    id={`${uid}-9`}
                    placeholder="RSD"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  />
                </div>
              </div>
              {formError && <p className="error-text">{formError}</p>}
              <div className="form-actions">
                <button className="primary" disabled={creating} onClick={handleCreate}>
                  Креирај фонд
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Листа фондова ── */}
      {funds.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗂️</span>
          <p>Нема фондова. {isAdmin ? "Додајте први фонд." : ""}</p>
        </div>
      ) : (
        <div className="funds-grid">
          {funds.map((f) => (
            <FundCard
              key={f.id}
              fund={f}
              isAdmin={isAdmin}
              freeInCurrency={freeBalance[f.capacity.currency] ?? 0}
              allFunds={funds}
              records={records}
            />
          ))}
        </div>
      )}
    </div>
  );
}
