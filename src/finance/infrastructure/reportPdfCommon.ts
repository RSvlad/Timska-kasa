import type { jsPDF } from "jspdf";
import { formatAmount } from "@shared/i18n/format";
import { LOCALE_FORMAT_TAGS } from "@shared/i18n/locale";

export const FONT = "Roboto";

export const PAGE = { width: 210, height: 297, margin: 15 } as const;
export const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin;

const FOOTER_RESERVE = 8;

// Прати вертикалну позицију и прелази на нову страницу када нема довољно места.
export class Cursor {
  y: number = PAGE.margin;

  constructor(private readonly doc: jsPDF) {}

  ensure(height: number, onNewPage?: () => void): void {
    if (this.y + height <= PAGE.height - PAGE.margin - FOOTER_RESERVE) return;
    this.newPage();
    onNewPage?.();
  }

  newPage(): void {
    this.doc.addPage();
    this.y = PAGE.margin;
  }
}

export type Rgb = readonly [number, number, number];

export const COLOR = {
  text: [45, 31, 24],
  muted: [122, 92, 80],
  grid: [230, 218, 210],
  headerFill: [250, 238, 232],
  accent: [224, 122, 95],
  income: [61, 153, 112],
  expense: [192, 57, 43],
} as const satisfies Record<string, Rgb>;

export function setText(doc: jsPDF, size: number, color: Rgb, bold = false): void {
  doc.setFont(FONT, bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

const PDF_FORMAT_TAG = LOCALE_FORMAT_TAGS.sr;

export function fmtAmount(value: number, currency: string): string {
  return formatAmount(value, currency, PDF_FORMAT_TAG);
}

export function fmtDate(date: Date): string {
  return date.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtTime(date: Date): string {
  return date.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
}
