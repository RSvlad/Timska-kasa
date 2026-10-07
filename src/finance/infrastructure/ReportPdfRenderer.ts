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
  fmtAmount,
  fmtDate,
  fmtTime,
  setText,
} from "@finance/infrastructure/reportPdfCommon";

const CHART_HEIGHT = 58;
const SUMMARY_HEIGHT = 15;
const SECTION_MIN_HEIGHT = 90;
const FOOTER_BASELINE = PAGE.height - 8;
const ALL_RECORDS_FILE = "izvestaj_svi-zapisi.pdf";

function periodLabel(period: Period | null): string {
  if (!period) return "Сви записи";
  return `${fmtDate(period.from)} – ${fmtDate(lastDayOf(period))}`;
}

function reportFileName(period: Period | null): string {
  if (!period) return ALL_RECORDS_FILE;
  return `izvestaj_${toDayInput(period.from)}_${toDayInput(lastDayOf(period))}.pdf`;
}

function chartSpan(period: Period | null, series: readonly BalancePoint[]): ChartSpan {
  if (period) return { start: period.from, end: lastDayOf(period) };
  return { start: series[0].date, end: series[series.length - 1].date };
}

function drawTitle(doc: jsPDF, cursor: Cursor, report: Report): void {
  const { margin } = PAGE;
  const generated = `${fmtDate(report.generatedAt)} ${fmtTime(report.generatedAt)}`;
  setText(doc, 18, COLOR.text, true);
  doc.text("Тимска каса — Извештај", margin, cursor.y + 6);
  setText(doc, 10, COLOR.muted);
  doc.text(`Период: ${periodLabel(report.period)}`, margin, cursor.y + 13);
  doc.text(`Генерисано: ${generated}`, margin, cursor.y + 18.5);
  doc.setDrawColor(...COLOR.accent);
  doc.setLineWidth(0.6);
  doc.line(margin, cursor.y + 22, margin + CONTENT_WIDTH, cursor.y + 22);
  cursor.y += 28;
}

function drawSummary(doc: jsPDF, cursor: Cursor, report: CurrencyReport): void {
  const items = [
    { label: "Почетно стање", value: report.openingBalance, color: COLOR.text },
    { label: "Приходи", value: report.income, color: COLOR.income },
    { label: "Расходи", value: report.expense, color: COLOR.expense },
    { label: "Крајње стање", value: report.closingBalance, color: COLOR.text },
  ];
  const columnWidth = CONTENT_WIDTH / items.length;
  items.forEach((item, i) => {
    const x = PAGE.margin + i * columnWidth;
    setText(doc, 8, COLOR.muted);
    doc.text(item.label, x, cursor.y + 3);
    setText(doc, 10.5, item.color, true);
    doc.text(fmtAmount(item.value, report.currency), x, cursor.y + 9);
  });
  cursor.y += SUMMARY_HEIGHT;
}

function drawChart(
  doc: jsPDF,
  cursor: Cursor,
  report: CurrencyReport,
  period: Period | null,
): void {
  setText(doc, 10, COLOR.text, true);
  doc.text(`Салдо током времена (${report.currency})`, PAGE.margin, cursor.y + 4);
  cursor.y += 6;
  const area = { x: PAGE.margin, y: cursor.y, width: CONTENT_WIDTH, height: CHART_HEIGHT };
  drawBalanceChart(doc, area, report.balanceSeries, chartSpan(period, report.balanceSeries));
  cursor.y += CHART_HEIGHT + 6;
}

function drawCurrencySection(
  doc: jsPDF,
  cursor: Cursor,
  report: CurrencyReport,
  period: Period | null,
): void {
  cursor.ensure(SECTION_MIN_HEIGHT);
  setText(doc, 14, COLOR.accent, true);
  doc.text(`Валута: ${report.currency}`, PAGE.margin, cursor.y + 5);
  cursor.y += 10;
  drawSummary(doc, cursor, report);
  drawChart(doc, cursor, report, period);
  drawCategoryTotals(doc, cursor, report);
  drawTransactions(doc, cursor, report);
}

function drawEmptyNotice(doc: jsPDF, cursor: Cursor): void {
  setText(doc, 11, COLOR.muted);
  doc.text("Нема записа за изабрани период.", PAGE.margin, cursor.y + 5);
}

function drawFooters(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    setText(doc, 8, COLOR.muted);
    doc.text("Тимска каса · Извештај", PAGE.margin, FOOTER_BASELINE);
    doc.text(`Страна ${page} / ${total}`, PAGE.width - PAGE.margin, FOOTER_BASELINE, {
      align: "right",
    });
  }
}

function drawReport(doc: jsPDF, report: Report): void {
  const cursor = new Cursor(doc);
  drawTitle(doc, cursor, report);
  if (report.currencies.length === 0) drawEmptyNotice(doc, cursor);
  report.currencies.forEach((currencyReport, index) => {
    if (index > 0) cursor.newPage();
    drawCurrencySection(doc, cursor, currencyReport, report.period);
  });
  drawFooters(doc);
}

// jsPDF и фонтови се учитавају тек при првом извештају да не оптерећују почетно учитавање.
export async function downloadReportPdf(report: Report): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerReportFonts(doc);
  drawReport(doc, report);
  doc.save(reportFileName(report.period));
}
