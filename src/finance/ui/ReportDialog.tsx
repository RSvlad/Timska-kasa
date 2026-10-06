// UI: избор периода и преузимање Извештаја као PDF.

import { useEffect, useId, useRef, useState } from "react";
import { exportReportPdf } from "@finance/application/reportExport";
import type { Category } from "@finance/domain/Category";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Fund } from "@finance/domain/Fund";
import { periodBounds, periodFromDayInputs, toDayInput, type Period } from "@finance/domain/Period";

type Range = "овај месец" | "ова година" | "све" | "прилагођено";

const RANGES: { id: Range; label: string }[] = [
  { id: "овај месец", label: "Месец" },
  { id: "ова година", label: "Година" },
  { id: "све", label: "Све" },
  { id: "прилагођено", label: "Период" },
];

const INVALID_PERIOD_MESSAGE = "Унесите исправан период: почетни датум не сме бити после крајњег.";
const GENERIC_ERROR_MESSAGE = "Извештај није направљен. Покушајте поново.";

type Resolved = { ok: true; period: Period | null } | { ok: false; error: string };

function resolveRange(range: Range, firstDay: string, lastDay: string): Resolved {
  if (range !== "прилагођено") return { ok: true, period: periodBounds(range) };
  const period = periodFromDayInputs(firstDay, lastDay);
  return period ? { ok: true, period } : { ok: false, error: INVALID_PERIOD_MESSAGE };
}

interface Props {
  records: FinanceRecord[];
  categories: Category[];
  funds: Fund[];
  onClose: () => void;
}

export function ReportDialog({ records, categories, funds, onClose }: Props) {
  const uid = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<Range>("овај месец");
  const [firstDay, setFirstDay] = useState(() => {
    const now = new Date();
    return toDayInput(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [lastDay, setLastDay] = useState(() => toDayInput(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dialogRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [busy, onClose]);

  async function handleGenerate() {
    const resolved = resolveRange(range, firstDay, lastDay);
    if (!resolved.ok) {
      setError(resolved.error);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await exportReportPdf(records, categories, funds, resolved.period);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : GENERIC_ERROR_MESSAGE);
      setBusy(false);
    }
  }

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="confirm-dialog report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
      >
        <p id={`${uid}-title`} className="confirm-title">
          Извештај
        </p>
        <p className="confirm-message">
          PDF са почетним и крајњим стањем, графиконом салда, збировима по категоријама и свим
          трансакцијама изабраног периода.
        </p>

        <div className="period-tabs" role="group" aria-label="Период извештаја">
          {RANGES.map((r) => (
            <button
              key={r.id}
              className={`period-tab ${range === r.id ? "active" : ""}`}
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === "прилагођено" && (
          <div className="form-row">
            <div className="form-field form-field--grow">
              <label className="field-label" htmlFor={`${uid}-from`}>
                Од
              </label>
              <input
                id={`${uid}-from`}
                type="date"
                value={firstDay}
                onChange={(e) => setFirstDay(e.target.value)}
              />
            </div>
            <div className="form-field form-field--grow">
              <label className="field-label" htmlFor={`${uid}-to`}>
                До
              </label>
              <input
                id={`${uid}-to`}
                type="date"
                value={lastDay}
                onChange={(e) => setLastDay(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button className="primary" onClick={handleGenerate} disabled={busy}>
            {busy ? "Прављење…" : "Направи PDF"}
          </button>
          <button className="ghost" onClick={onClose} disabled={busy}>
            Откажи
          </button>
        </div>
      </div>
    </div>
  );
}
