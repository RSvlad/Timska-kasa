// UI: Страница за управљање Фондовима (CRUD + алокација/дезалокација).
// Само Admin може да мутира; Viewer само чита.

import { useState } from "react";
import { useFundList } from "@finance/application/useFundList";
import { useRecordList } from "@finance/application/useRecordList";
import {
  addFund,
  editFund,
  removeFund,
  reserveIntoFund,
  releaseFromFund,
  freeBalanceByCurrency,
} from "@finance/application/useFundManager";
import type { Fund } from "@finance/domain/Fund";
import type { Role } from "@identity/domain/User";

interface Props {
  role: Role;
}

const EMPTY_FORM = { name: "", description: "", capacity: "", currency: "RSD" };

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency", currency, maximumFractionDigits: 2,
  }).format(value);
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color =
    clamped >= 90 ? "var(--red)" :
    clamped >= 60 ? "var(--accent)" :
    "var(--green)";
  return (
    <div className="fund-bar-track">
      <div
        className="fund-bar-fill"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}

interface FundCardProps {
  fund: Fund;
  isAdmin: boolean;
  freeInCurrency: number;
  allFunds: Fund[];
  records: ReturnType<typeof useRecordList>;
}

function FundCard({ fund, isAdmin, freeInCurrency, allFunds, records }: FundCardProps) {
  const [deltaInput, setDeltaInput] = useState("");
  const [mode, setMode]             = useState<"reserve" | "release" | null>(null);
  const [err, setErr]               = useState("");
  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState({
    name: fund.name,
    description: fund.description ?? "",
    capacity: String(fund.capacity.value),
    currency: fund.capacity.currency,
  });

  const pct = fund.capacity.value > 0
    ? (fund.reserved / fund.capacity.value) * 100
    : 0;
  const available = fund.capacity.value - fund.reserved;

  async function handleTransfer() {
    const delta = Number(deltaInput);
    if (!deltaInput || isNaN(delta) || delta <= 0) {
      setErr("Унеси позитиван износ."); return;
    }
    setErr("");
    try {
      if (mode === "reserve") {
        await reserveIntoFund(fund, delta, records, allFunds);
      } else {
        await releaseFromFund(fund, delta);
      }
      setDeltaInput(""); setMode(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Грешка.");
    }
  }

  async function handleEdit() {
    const cap = Number(editForm.capacity);
    if (!editForm.name.trim()) { setErr("Назив је обавезан."); return; }
    if (isNaN(cap) || cap <= 0) { setErr("Капацитет мора бити позитиван број."); return; }
    if (!editForm.currency.trim()) { setErr("Валута је обавезна."); return; }
    setErr("");
    try {
      await editFund(fund.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        capacity: { value: cap, currency: editForm.currency.trim().toUpperCase() },
      });
      setEditing(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Грешка.");
    }
  }

  async function handleDelete() {
    if (!confirm(`Обриши фонд „${fund.name}"? Ова акција је трајна.`)) return;
    await removeFund(fund.id);
  }

  return (
    <div className="fund-card">
      {editing ? (
        <div className="fund-edit-form">
          <div className="form-field">
            <label className="field-label">Назив</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div className="form-field">
            <label className="field-label">Опис <span className="field-optional">(опционо)</span></label>
            <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-field form-field--grow">
              <label className="field-label">Капацитет</label>
              <input inputMode="decimal" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} />
            </div>
            <div className="form-field form-field--currency">
              <label className="field-label">Валута</label>
              <input value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })} />
            </div>
          </div>
          {err && <p className="error-text">{err}</p>}
          <div className="form-actions">
            <button className="primary" onClick={handleEdit}>Сачувај</button>
            <button className="ghost" onClick={() => { setEditing(false); setErr(""); }}>Откажи</button>
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
                <button className="ghost chip-action-btn" onClick={() => { setEditing(true); setErr(""); }}>✎</button>
                <button className="ghost chip-action-btn danger" onClick={handleDelete}>✕</button>
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
              <span className="fund-amount-val">{fmt(fund.capacity.value, fund.capacity.currency)}</span>
            </div>
            <div className="fund-amount-row">
              <span className="fund-amount-label">Слободно у фонду</span>
              <span className="fund-amount-val income-val">{fmt(available, fund.capacity.currency)}</span>
            </div>
          </div>

          <ProgressBar pct={pct} />
          <p className="fund-pct-label">{Math.round(pct)}% попуњено</p>

          {isAdmin && (
            <>
              {mode === null ? (
                <div className="fund-transfer-btns">
                  <button
                    className="ghost"
                    onClick={() => { setMode("reserve"); setErr(""); }}
                    disabled={freeInCurrency <= 0 || available <= 0}
                  >
                    + Алоцирај
                  </button>
                  <button
                    className="ghost"
                    onClick={() => { setMode("release"); setErr(""); }}
                    disabled={fund.reserved <= 0}
                  >
                    − Дезалоцирај
                  </button>
                </div>
              ) : (
                <div className="fund-transfer-form">
                  <div className="form-row">
                    <div className="form-field form-field--grow">
                      <label className="field-label">
                        {mode === "reserve" ? `Алоцирај (слободно у тимској каси: ${freeInCurrency.toLocaleString("sr-RS")} ${fund.capacity.currency})` : "Дезалоцирај"}
                      </label>
                      <input
                        inputMode="decimal"
                        placeholder="0.00"
                        value={deltaInput}
                        onChange={(e) => setDeltaInput(e.target.value)}
                      />
                    </div>
                  </div>
                  {err && <p className="error-text">{err}</p>}
                  <div className="form-actions">
                    <button className="primary" onClick={handleTransfer}>Потврди</button>
                    <button className="ghost" onClick={() => { setMode(null); setDeltaInput(""); setErr(""); }}>Откажи</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Главна компонента ──────────────────────────────────────────────────────

export function FundsPage({ role }: Props) {
  const funds   = useFundList();
  const records = useRecordList();
  const isAdmin = role === "Admin";

  const [form,      setForm]      = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [open,      setOpen]      = useState(false);

  const freeBalance = freeBalanceByCurrency(records, funds);

  function validate(): string {
    if (!form.name.trim())                                          return "Назив је обавезан.";
    if (!form.capacity || isNaN(Number(form.capacity)) || Number(form.capacity) <= 0)
                                                                    return "Капацитет мора бити позитиван број.";
    if (!form.currency.trim())                                      return "Валута је обавезна.";
    return "";
  }

  async function handleCreate() {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError("");
    await addFund({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      capacity: { value: Number(form.capacity), currency: form.currency.trim().toUpperCase() },
    });
    setForm(EMPTY_FORM);
    setOpen(false);
  }

  return (
    <div className="funds-root">

      {/* ── Форма за креирање (само Admin) ── */}
      {isAdmin && (
        <div className="card mb-16">
          <button
            className={`form-toggle ${open ? "open" : ""}`}
            onClick={() => { setOpen((v) => !v); if (open) { setForm(EMPTY_FORM); setFormError(""); } }}
          >
            <span>{open ? "✕  Затвори" : "+ Нови фонд"}</span>
          </button>
          {open && (
            <div>
              <div className="form-field">
                <label className="field-label">Назив</label>
                <input
                  placeholder="Нпр. Путни трошкови"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="field-label">Опис <span className="field-optional">(опционо)</span></label>
                <input
                  placeholder=""
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-field form-field--grow">
                  <label className="field-label">Капацитет</label>
                  <input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  />
                </div>
                <div className="form-field form-field--currency">
                  <label className="field-label">Валута</label>
                  <input
                    placeholder="RSD"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  />
                </div>
              </div>
              {formError && <p className="error-text">{formError}</p>}
              <div className="form-actions">
                <button className="primary" onClick={handleCreate}>Креирај фонд</button>
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
