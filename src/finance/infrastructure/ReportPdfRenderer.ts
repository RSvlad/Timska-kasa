import type { jsPDF } from "jspdf";
import { lastDayOf, toDayInput, type Period } from "@finance/domain/Period";
import type { BalancePoint, CurrencyReport, Report } from "@finance/domain/Report";
import { drawBalanceChart, type ChartSpan } from "@finance/infrastructure/ReportPdfChart";
import { registerReportFonts } from "@finance/infrastructure/ReportPdfFonts";
import { drawCategoryTotals, drawTransactions } from "@finance/infrastructure/ReportPdfTables";
import {
  COLOR,
  CONTENT_WIDTH,
  Cursor,
  PAGE,
  setText,
} from "@finance/infrastructure/reportPdfCommon";
import { createPdfContext, type PdfContext } from "@finance/infrastructure/reportPdfContext";
import type { Locale } from "@shared/i18n/locale";

const CHART_HEIGHT = 58;
const SUMMARY_HEIGHT = 15;
const SECTION_MIN_HEIGHT = 90;
const FOOTER_BASELINE = PAGE.height - 8;

function periodLabel(period: Period | null, ctx: PdfContext): string {
  if (!period) return ctx.t("pdf.period.all");
  return `${ctx.date(period.from)} – ${ctx.date(lastDayOf(period))}`;
}

function reportFileName(period: Period | null, ctx: PdfContext): string {
  const prefix = ctx.t("pdf.file.prefix");
  if (!period) return `${prefix}_${ctx.t("pdf.file.all")}.pdf`;
  return `${prefix}_${toDayInput(period.from)}_${toDayInput(lastDayOf(period))}.pdf`;
}

function chartSpan(period: Period | null, series: readonly BalancePoint[]): ChartSpan {
  if (period) return { start: period.from, end: lastDayOf(period) };
  return { start: series[0].date, end: series[series.length - 1].date };
}

function drawTitle(doc: jsPDF, cursor: Cursor, report: Report, ctx: PdfContext): void {
  const { margin } = PAGE;
  const generated = `${ctx.date(report.generatedAt)} ${ctx.time(report.generatedAt)}`;
  setText(doc, 18, COLOR.text, true);
  doc.text(ctx.t("pdf.title"), margin, cursor.y + 6);
  setText(doc, 10, COLOR.muted);
  doc.text(ctx.t("pdf.period", { period: periodLabel(report.period, ctx) }), margin, cursor.y + 13);
  doc.text(ctx.t("pdf.generated", { date: generated }), margin, cursor.y + 18.5);
  doc.setDrawColor(...COLOR.accent);
  doc.setLineWidth(0.6);
  doc.line(margin, cursor.y + 22, margin + CONTENT_WIDTH, cursor.y + 22);
  cursor.y += 28;
}

function drawSummary(doc: jsPDF, cursor: Cursor, report: CurrencyReport, ctx: PdfContext): void {
  const items = [
    { label: ctx.t("pdf.summary.opening"), value: report.openingBalance, color: COLOR.text },
    { label: ctx.t("pdf.summary.income"), value: report.income, color: COLOR.income },
    { label: ctx.t("pdf.summary.expense"), value: report.expense, color: COLOR.expense },
    { label: ctx.t("pdf.summary.closing"), value: report.closingBalance, color: COLOR.text },
  ];
  const columnWidth = CONTENT_WIDTH / items.length;
  items.forEach((item, i) => {
    const x = PAGE.margin + i * columnWidth;
    setText(doc, 8, COLOR.muted);
    doc.text(item.label, x, cursor.y + 3);
    setText(doc, 10.5, item.color, true);
    doc.text(ctx.amount(item.value, report.currency), x, cursor.y + 9);
  });
  cursor.y += SUMMARY_HEIGHT;
}

function drawChart(
  doc: jsPDF,
  cursor: Cursor,
  report: CurrencyReport,
  period: Period | null,
  ctx: PdfContext,
): void {
  setText(doc, 10, COLOR.text, true);
  doc.text(ctx.t("pdf.chart.title", { currency: report.currency }), PAGE.margin, cursor.y + 4);
  cursor.y += 6;
  const area = { x: PAGE.margin, y: cursor.y, width: CONTENT_WIDTH, height: CHART_HEIGHT };
  const span = chartSpan(period, report.balanceSeries);
  drawBalanceChart(doc, area, report.balanceSeries, span, ctx);
  cursor.y += CHART_HEIGHT + 6;
}

function drawCurrencySection(
  doc: jsPDF,
  cursor: Cursor,
  report: CurrencyReport,
  period: Period | null,
  ctx: PdfContext,
): void {
  cursor.ensure(SECTION_MIN_HEIGHT);
  setText(doc, 14, COLOR.accent, true);
  doc.text(ctx.t("pdf.currency", { currency: report.currency }), PAGE.margin, cursor.y + 5);
  cursor.y += 10;
  drawSummary(doc, cursor, report, ctx);
  drawChart(doc, cursor, report, period, ctx);
  drawCategoryTotals(doc, cursor, report, ctx);
  drawTransactions(doc, cursor, report, ctx);
}

function drawEmptyNotice(doc: jsPDF, cursor: Cursor, ctx: PdfContext): void {
  setText(doc, 11, COLOR.muted);
  doc.text(ctx.t("pdf.empty"), PAGE.margin, cursor.y + 5);
}

function drawFooters(doc: jsPDF, ctx: PdfContext): void {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    setText(doc, 8, COLOR.muted);
    doc.text(ctx.t("pdf.footer.title"), PAGE.margin, FOOTER_BASELINE);
    doc.text(ctx.t("pdf.footer.page", { page, total }), PAGE.width - PAGE.margin, FOOTER_BASELINE, {
      align: "right",
    });
  }
}

function drawReport(doc: jsPDF, report: Report, ctx: PdfContext): void {
  const cursor = new Cursor(doc);
  drawTitle(doc, cursor, report, ctx);
  if (report.currencies.length === 0) drawEmptyNotice(doc, cursor, ctx);
  report.currencies.forEach((currencyReport, index) => {
    if (index > 0) cursor.newPage();
    drawCurrencySection(doc, cursor, currencyReport, report.period, ctx);
  });
  drawFooters(doc, ctx);
}

// jsPDF и фонтови се учитавају тек при првом извештају да не оптерећују почетно учитавање.
export async function downloadReportPdf(report: Report, locale: Locale): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerReportFonts(doc);
  const ctx = createPdfContext(locale);
  drawReport(doc, report, ctx);
  doc.save(reportFileName(report.period, ctx));
}
