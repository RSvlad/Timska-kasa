// UI: Дашборд — кумулативни салдо (сви записи), период филтрира само трансакције.

import { useState, useMemo } from "react";
import { useRecordList } from "@finance/application/useRecordList";
import { useCategoryList } from "@finance/application/useCategoryList";
import { useFundList } from "@finance/application/useFundList";
import { freeBalanceByCurrency } from "@finance/application/useFundManager";
import type { RecordType } from "@finance/domain/Category";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Fund } from "@finance/domain/Fund";

type PeriodPreset = "данас" | "овај месец" | "ова година" | "све";

const PERIODS: { id: PeriodPreset; label: string }[] = [
  { id: "данас",      label: "Данас" },
  { id: "овај месец", label: "Месец" },
  { id: "ова година", label: "Година" },
  { id: "све",        label: "Све" },
];

function periodBounds(preset: PeriodPreset): { from: Date; to: Date } | null {
  const now = new Date();
  if (preset === "све") return null;
  if (preset === "данас") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to: new Date(from.getTime() + 86_400_000) };
  }
  if (preset === "овај месец") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to:   new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to:   new Date(now.getFullYear() + 1, 0, 1),
  };
}

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency", currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + "М";
  if (Math.abs(value) >= 1_000)     return (value / 1_000).toFixed(1) + "К";
  return value.toLocaleString("sr-RS");
}

// Агрегација по валути из произвољног скупа записа
function aggregate(records: FinanceRecord[]): Record<string, { income: number; expense: number }> {
  const map: Record<string, { income: number; expense: number }> = {};
  for (const r of records) {
    const cur = r.amount.currency;
    if (!map[cur]) map[cur] = { income: 0, expense: 0 };
    if (r.type === "Приход") map[cur].income += r.amount.value;
    else                     map[cur].expense += r.amount.value;
  }
  return map;
}

// ── Подкомпоненте ──────────────────────────────────────────────────────────

function WalletCard({
  currency, income, expense, funds,
}: {
  currency: string; income: number; expense: number; funds: Fund[];
}) {
  const balance  = income - expense;
  const positive = balance >= 0;

  // алоцирано у овој валути
  const totalReserved = funds
    .filter((f) => f.capacity.currency === currency)
    .reduce((sum, f) => sum + f.reserved, 0);
  const free = balance - totalReserved;
  const hasReservations = totalReserved > 0;

  return (
    <div className="wallet-card">
      <p className="wallet-currency">{currency}</p>
      <p className={`wallet-balance ${positive ? "pos" : "neg"}`}>
        {fmt(balance, currency)}
      </p>

      {hasReservations && (
        <div className="wallet-reserved-row">
          <div className="wallet-reserved-item">
            <span className="wallet-reserved-label">Слободно</span>
            <span className={`wallet-reserved-val ${free >= 0 ? "income-val" : "expense-val"}`}>
              {fmt(free, currency)}
            </span>
          </div>
          <div className="wallet-reserved-divider" />
          <div className="wallet-reserved-item">
            <span className="wallet-reserved-label">Алоцирано</span>
            <span className="wallet-reserved-val" style={{ color: "var(--accent)" }}>
              {fmt(totalReserved, currency)}
            </span>
          </div>
        </div>
      )}

      <div className="wallet-stats">
        <div className="wallet-stat">
          <span className="stat-dot income-dot" />
          <span className="stat-label">Приходи</span>
          <span className="stat-val income-val">+{fmtCompact(income)}</span>
        </div>
        <div className="wallet-divider" />
        <div className="wallet-stat">
          <span className="stat-dot expense-dot" />
          <span className="stat-label">Расходи</span>
          <span className="stat-val expense-val">−{fmtCompact(expense)}</span>
        </div>
      </div>

      {/* ratio bar */}
      {income + expense > 0 && (() => {
        const pct = Math.round((income / (income + expense)) * 100);
        return (
          <div className="ratio-bar">
            <div className="ratio-fill income-fill"  style={{ width: `${pct}%` }} />
            <div className="ratio-fill expense-fill" style={{ width: `${100 - pct}%` }} />
          </div>
        );
      })()}
    </div>
  );
}

function RecentItem({ record, categoryName }: { record: FinanceRecord; categoryName: string }) {
  const isIncome = record.type === "Приход";
  const d = record.dateTime;
  const dateStr = d.toLocaleDateString("sr-RS", { day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="recent-item">
      <div className={`recent-icon ${isIncome ? "income-icon" : "expense-icon"}`}>
        {isIncome ? "↑" : "↓"}
      </div>
      <div className="recent-meta">
        <span className="recent-counterparty">{record.counterparty}</span>
        <span className="recent-cat">{categoryName}</span>
      </div>
      <div className="recent-right">
        <span className={`recent-amount ${isIncome ? "income-val" : "expense-val"}`}>
          {isIncome ? "+" : "−"}{fmtCompact(record.amount.value)} {record.amount.currency}
        </span>
        <span className="recent-time">{dateStr} {timeStr}</span>
      </div>
    </div>
  );
}

// ── Главна компонента ──────────────────────────────────────────────────────

export function Dashboard() {
  const records    = useRecordList();
  const categories = useCategoryList();
  const funds      = useFundList();

  const [period,         setPeriod]         = useState<PeriodPreset>("овај месец");
  const [typeFilter,     setTypeFilter]     = useState<RecordType | "Сви">("Сви");
  const [categoryFilter, setCategoryFilter] = useState<string>("све");

  // Кумулативни салдо — сви записи, игнорише све филтере
  const totalSummary = useMemo(() => aggregate(records), [records]);
  const totalCurrencies = Object.keys(totalSummary).sort();

  // Филтрирани скуп — само за листу трансакција
  const filtered = useMemo(() => {
    const bounds = periodBounds(period);
    return records.filter((r) => {
      if (bounds && (r.dateTime < bounds.from || r.dateTime >= bounds.to)) return false;
      if (typeFilter !== "Сви" && r.type !== typeFilter) return false;
      if (categoryFilter !== "све" && r.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [records, period, typeFilter, categoryFilter]);

  const recent = useMemo(
    () => [...filtered].sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime()).slice(0, 10),
    [filtered]
  );

  // Не користимо freeBalanceByCurrency директно овде — WalletCard рачуна сам
  void freeBalanceByCurrency; // imported ради евентуалне будуће употребе

  function catName(id: string): string {
    return categories.find((c) => c.id === id)?.name ?? "—";
  }

  const hasFilters = typeFilter !== "Сви" || categoryFilter !== "све";

  return (
    <div className="db-root">

      {/* ── Новчаник картице (кумулативно) ── */}
      {totalCurrencies.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💰</span>
          <p>Нема записа. Додајте први унос.</p>
        </div>
      ) : (
        totalCurrencies.map((cur) => (
          <WalletCard key={cur} currency={cur} {...totalSummary[cur]} funds={funds} />
        ))
      )}

      {/* ── Период + филтери ── */}
      <div className="card">
        <p className="section-title">Трансакције</p>
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              className={`period-tab ${period === p.id ? "active" : ""}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <details className="filter-details">
          <summary className={`filter-summary ${hasFilters ? "has-filters" : ""}`}>
            <span>Филтери</span>
            {hasFilters && <span className="filter-badge">●</span>}
          </summary>
          <div className="filter-body">
            <label className="filter-label">
              Тип
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as RecordType | "Сви")}>
                <option value="Сви">Сви</option>
                <option value="Приход">Приход</option>
                <option value="Расход">Расход</option>
              </select>
            </label>
            <label className="filter-label">
              Категорија
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="све">Све</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </label>
          </div>
        </details>

        {recent.length === 0 ? (
          <p className="empty-inline">Нема трансакција за изабрани период.</p>
        ) : (
          <div className="recent-list">
            {recent.map((r) => (
              <RecentItem key={r.id} record={r} categoryName={catName(r.categoryId)} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
