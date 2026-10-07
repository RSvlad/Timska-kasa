import type { jsPDF } from "jspdf";
import type { CurrencyReport, ReportEntry } from "@finance/domain/Report";
import {
  COLOR,
  CONTENT_WIDTH,
  PAGE,
  setText,
  type Cursor,
  type Rgb,
} from "@finance/infrastructure/reportPdfCommon";
import type { PdfContext } from "@finance/infrastructure/reportPdfContext";

const LINE_HEIGHT = 3.9;
const ROW_PADDING = 2.4;
const TEXT_BASELINE = 3.2;
const HEADER_HEIGHT = 6.5;
const SUBHEADING_HEIGHT = 8;
const TOTAL_LABEL_WIDTH = CONTENT_WIDTH - 50;
const COLUMN = { date: 0, category: 31, party: 66 } as const;
const COLUMN_WIDTH = { category: 33, party: 76 } as const;
const BORDER_WIDTH = 0.1;
const SIGN = { income: "+", expense: "−" } as const;

function wrap(doc: jsPDF, text: string, width: number): string[] {
  return text ? (doc.splitTextToSize(text, width) as string[]) : [];
}

function drawLines(doc: jsPDF, lines: string[], x: number, y: number): void {
  lines.forEach((line, i) => doc.text(line, x, y + i * LINE_HEIGHT));
}

function drawRowBorder(doc: jsPDF, y: number): void {
  doc.setDrawColor(...COLOR.grid);
  doc.setLineWidth(BORDER_WIDTH);
  doc.line(PAGE.margin, y, PAGE.margin + CONTENT_WIDTH, y);
}

function drawSubheading(doc: jsPDF, cursor: Cursor, title: string): void {
  cursor.ensure(SUBHEADING_HEIGHT + LINE_HEIGHT * 2);
  setText(doc, 10, COLOR.text, true);
  doc.text(title, PAGE.margin, cursor.y + 4);
  cursor.y += SUBHEADING_HEIGHT;
}

function drawTotalRow(doc: jsPDF, cursor: Cursor, label: string, amount: string, color: Rgb): void {
  setText(doc, 9, COLOR.text);
  const lines = wrap(doc, label, TOTAL_LABEL_WIDTH);
  const height = Math.max(lines.length, 1) * LINE_HEIGHT + ROW_PADDING;
  cursor.ensure(height);
  drawLines(doc, lines, PAGE.margin, cursor.y + TEXT_BASELINE);
  setText(doc, 9, color, true);
  doc.text(amount, PAGE.margin + CONTENT_WIDTH, cursor.y + TEXT_BASELINE, { align: "right" });
  drawRowBorder(doc, cursor.y + height);
  cursor.y += height;
}

export function drawCategoryTotals(
  doc: jsPDF,
  cursor: Cursor,
  report: CurrencyReport,
  ctx: PdfContext,
): void {
  const sections = [
    { type: "Приход", title: ctx.t("pdf.totals.income"), color: COLOR.income },
    { type: "Расход", title: ctx.t("pdf.totals.expense"), color: COLOR.expense },
  ] as const;
  for (const { type, title, color } of sections) {
    const totals = report.categoryTotals.filter((t) => t.type === type);
    if (totals.length === 0) continue;
    drawSubheading(doc, cursor, title);
    for (const t of totals) {
      drawTotalRow(doc, cursor, t.categoryName, ctx.amount(t.total, report.currency), color);
    }
    cursor.y += 4;
  }
}

function drawTableHeader(doc: jsPDF, cursor: Cursor, ctx: PdfContext): void {
  doc.setFillColor(...COLOR.headerFill);
  doc.rect(PAGE.margin, cursor.y, CONTENT_WIDTH, HEADER_HEIGHT, "F");
  setText(doc, 8, COLOR.muted, true);
  const baseline = cursor.y + 4.4;
  doc.text(ctx.t("pdf.table.dateTime"), PAGE.margin + COLUMN.date + 1, baseline);
  doc.text(ctx.t("pdf.table.category"), PAGE.margin + COLUMN.category, baseline);
  doc.text(ctx.t("pdf.table.counterparty"), PAGE.margin + COLUMN.party, baseline);
  doc.text(ctx.t("pdf.table.amount"), PAGE.margin + CONTENT_WIDTH - 1, baseline, {
    align: "right",
  });
  cursor.y += HEADER_HEIGHT;
}

function detailText(entry: ReportEntry, ctx: PdfContext): string {
  const fund = entry.fundName ? ctx.t("pdf.table.fund", { name: entry.fundName }) : "";
  return [entry.record.description, fund].filter(Boolean).join(" · ");
}

function drawEntryRow(
  doc: jsPDF,
  cursor: Cursor,
  entry: ReportEntry,
  currency: string,
  ctx: PdfContext,
): void {
  const { record } = entry;
  setText(doc, 8, COLOR.text, true);
  const partyLines = wrap(doc, record.counterparty, COLUMN_WIDTH.party);
  setText(doc, 8, COLOR.text);
  const categoryLines = wrap(doc, entry.categoryName, COLUMN_WIDTH.category);
  const detailLines = wrap(doc, detailText(entry, ctx), COLUMN_WIDTH.party);
  const lineCount = Math.max(categoryLines.length, partyLines.length + detailLines.length, 1);
  const height = lineCount * LINE_HEIGHT + ROW_PADDING;
  cursor.ensure(height, () => drawTableHeader(doc, cursor, ctx));

  const baseline = cursor.y + TEXT_BASELINE + ROW_PADDING / 2;
  setText(doc, 8, COLOR.text);
  const when = `${ctx.date(record.dateTime)} ${ctx.time(record.dateTime)}`;
  doc.text(when, PAGE.margin + COLUMN.date + 1, baseline);
  drawLines(doc, categoryLines, PAGE.margin + COLUMN.category, baseline);
  setText(doc, 8, COLOR.text, true);
  drawLines(doc, partyLines, PAGE.margin + COLUMN.party, baseline);
  setText(doc, 8, COLOR.muted);
  drawLines(
    doc,
    detailLines,
    PAGE.margin + COLUMN.party,
    baseline + partyLines.length * LINE_HEIGHT,
  );
  drawEntryAmount(doc, entry, currency, baseline, ctx);
  drawRowBorder(doc, cursor.y + height);
  cursor.y += height;
}

function drawEntryAmount(
  doc: jsPDF,
  entry: ReportEntry,
  currency: string,
  y: number,
  ctx: PdfContext,
): void {
  const { type, amount } = entry.record;
  const isIncome = type === "Приход";
  setText(doc, 8.5, isIncome ? COLOR.income : COLOR.expense, true);
  const text = `${isIncome ? SIGN.income : SIGN.expense}${ctx.amount(amount.value, currency)}`;
  doc.text(text, PAGE.margin + CONTENT_WIDTH - 1, y, { align: "right" });
}

export function drawTransactions(
  doc: jsPDF,
  cursor: Cursor,
  report: CurrencyReport,
  ctx: PdfContext,
): void {
  drawSubheading(doc, cursor, ctx.t("pdf.table.title"));
  cursor.ensure(HEADER_HEIGHT + LINE_HEIGHT + ROW_PADDING);
  drawTableHeader(doc, cursor, ctx);
  for (const entry of report.entries) {
    drawEntryRow(doc, cursor, entry, report.currency, ctx);
  }
  if (report.entries.length === 0) {
    setText(doc, 9, COLOR.muted);
    doc.text(ctx.t("pdf.table.empty"), PAGE.margin + 1, cursor.y + 5);
    cursor.y += 8;
  }
}
