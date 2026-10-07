// UI: избор периода и преузимање Извештаја као PDF.

import { useEffect, useId, useRef, useState } from "react";
import { exportReportPdf } from "@finance/application/reportExport";
import type { Category } from "@finance/domain/Category";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Fund } from "@finance/domain/Fund";
import { periodBounds, periodFromDayInputs, toDayInput, type Period } from "@finance/domain/Period";
import { useLocale, useT } from "@shared/i18n/I18nProvider";
import { sharedMessages } from "@shared/ui/messages";
import { reportMessages } from "@finance/ui/ReportDialog.messages";
import { financeMessages, PERIOD_PRESET_KEYS } from "@finance/ui/finance.messages";

const CUSTOM_RANGE = "прилагођено";

type Range = "овај месец" | "ова година" | "све" | typeof CUSTOM_RANGE;

const RANGES: Range[] = ["овај месец", "ова година", "све", CUSTOM_RANGE];

type Resolved = { ok: true; period: Period | null } | { ok: false };

function resolveRange(range: Range, firstDay: string, lastDay: string): Resolved {
  if (range !== CUSTOM_RANGE) return { ok: true, period: periodBounds(range) };
  const period = periodFromDayInputs(firstDay, lastDay);
  return period ? { ok: true, period } : { ok: false };
}

interface Props {
  records: FinanceRecord[];
  categories: Category[];
  funds: Fund[];
  onClose: () => void;
}

export function ReportDialog({ records, categories, funds, onClose }: Props) {
  const uid = useId();
  const { locale } = useLocale();
  const t = useT(reportMessages);
  const tf = useT(financeMessages);
  const tShared = useT(sharedMessages);
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
      setError(t("report.error.invalidPeriod"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await exportReportPdf(records, categories, funds, resolved.period, locale);
      onClose();
    } catch {
      setError(t("report.error.generic"));
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
          {t("report.title")}
        </p>
        <p className="confirm-message">{t("report.description")}</p>

        <div className="period-tabs" role="group" aria-label={t("report.range.label")}>
          {RANGES.map((id) => (
            <button
              key={id}
              className={`period-tab ${range === id ? "active" : ""}`}
              aria-pressed={range === id}
              onClick={() => setRange(id)}
            >
              {id === CUSTOM_RANGE ? t("report.range.custom") : tf(PERIOD_PRESET_KEYS[id])}
            </button>
          ))}
        </div>

        {range === CUSTOM_RANGE && (
          <div className="form-row">
            <div className="form-field form-field--grow">
              <label className="field-label" htmlFor={`${uid}-from`}>
                {t("report.field.from")}
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
                {t("report.field.to")}
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
            {busy ? t("report.generating") : t("report.generate")}
          </button>
          <button className="ghost" onClick={onClose} disabled={busy}>
            {tShared("confirm.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
