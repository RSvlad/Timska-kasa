import type { jsPDF } from "jspdf";
import type { BalancePoint } from "@finance/domain/Report";
import { COLOR, setText } from "@finance/infrastructure/reportPdfCommon";
import type { PdfContext } from "@finance/infrastructure/reportPdfContext";

const DAY_MS = 86_400_000;
const GRID_INTERVALS = 4;
const X_TICK_INTERVALS = 4;
const MARKER_LIMIT = 60;
const MARKER_RADIUS = 0.7;
const SERIES_LINE_WIDTH = 0.5;
const GRID_LINE_WIDTH = 0.15;
const Y_PADDING_RATIO = 0.08;
const SMALL_RANGE = 10;
const PAD = { left: 24, right: 3, top: 3, bottom: 8 } as const;

export interface ChartArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Укључиви распон дана на x оси.
export interface ChartSpan {
  start: Date;
  end: Date;
}

interface Scale {
  left: number;
  right: number;
  top: number;
  bottom: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  x: (time: number) => number;
  y: (value: number) => number;
}

function createScale(area: ChartArea, series: readonly BalancePoint[], span: ChartSpan): Scale {
  const left = area.x + PAD.left;
  const right = area.x + area.width - PAD.right;
  const top = area.y + PAD.top;
  const bottom = area.y + area.height - PAD.bottom;
  const xMin = span.start.getTime();
  const xMax = Math.max(span.end.getTime(), xMin + DAY_MS);

  const values = series.map((p) => p.balance);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low) * Y_PADDING_RATIO || Math.max(Math.abs(high) * 0.1, 1);
  const yMin = low - pad;
  const yMax = high + pad;

  return {
    left,
    right,
    top,
    bottom,
    xMin,
    xMax,
    yMin,
    yMax,
    x: (time) => left + ((time - xMin) / (xMax - xMin)) * (right - left),
    y: (value) => bottom - ((value - yMin) / (yMax - yMin)) * (bottom - top),
  };
}

function drawYAxis(doc: jsPDF, s: Scale, ctx: PdfContext): void {
  const fractionDigits = s.yMax - s.yMin < SMALL_RANGE ? 2 : 0;
  doc.setLineWidth(GRID_LINE_WIDTH);
  doc.setDrawColor(...COLOR.grid);
  setText(doc, 7, COLOR.muted);
  for (let i = 0; i <= GRID_INTERVALS; i++) {
    const value = s.yMin + ((s.yMax - s.yMin) * i) / GRID_INTERVALS;
    const y = s.y(value);
    doc.line(s.left, y, s.right, y);
    const label = ctx.number(value, fractionDigits);
    doc.text(label, s.left - 1.5, y + 1, { align: "right" });
  }
}

function drawZeroLine(doc: jsPDF, s: Scale): void {
  if (s.yMin >= 0 || s.yMax <= 0) return;
  doc.setDrawColor(...COLOR.muted);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(s.left, s.y(0), s.right, s.y(0));
  doc.setLineDashPattern([], 0);
}

function drawXAxis(doc: jsPDF, s: Scale, ctx: PdfContext): void {
  setText(doc, 7, COLOR.muted);
  for (let i = 0; i <= X_TICK_INTERVALS; i++) {
    const time = s.xMin + ((s.xMax - s.xMin) * i) / X_TICK_INTERVALS;
    const label = ctx.dayMonth(new Date(time));
    const align = i === 0 ? "left" : i === X_TICK_INTERVALS ? "right" : "center";
    doc.text(label, s.x(time), s.bottom + 4.5, { align });
  }
}

// Салдо се држи константним до следеће промене, па се црта као степенаста линија.
function drawSteps(doc: jsPDF, s: Scale, series: readonly BalancePoint[]): void {
  doc.setDrawColor(...COLOR.accent);
  doc.setLineWidth(SERIES_LINE_WIDTH);
  let prevX = s.x(series[0].date.getTime());
  let prevY = s.y(series[0].balance);
  for (const point of series.slice(1)) {
    const x = s.x(point.date.getTime());
    const y = s.y(point.balance);
    doc.line(prevX, prevY, x, prevY);
    doc.line(x, prevY, x, y);
    [prevX, prevY] = [x, y];
  }
  doc.line(prevX, prevY, s.right, prevY);
}

function drawMarkers(doc: jsPDF, s: Scale, series: readonly BalancePoint[]): void {
  if (series.length > MARKER_LIMIT) return;
  doc.setFillColor(...COLOR.accent);
  for (const point of series) {
    doc.circle(s.x(point.date.getTime()), s.y(point.balance), MARKER_RADIUS, "F");
  }
}

export function drawBalanceChart(
  doc: jsPDF,
  area: ChartArea,
  series: readonly BalancePoint[],
  span: ChartSpan,
  ctx: PdfContext,
): void {
  const scale = createScale(area, series, span);
  drawYAxis(doc, scale, ctx);
  drawZeroLine(doc, scale);
  drawSteps(doc, scale, series);
  drawMarkers(doc, scale, series);
  drawXAxis(doc, scale, ctx);
}
