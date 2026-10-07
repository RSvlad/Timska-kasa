import { defineMessages } from "@shared/i18n/messages";

export const reportMessages = defineMessages({
  sr: {
    "report.title": "Извештај",
    "report.description":
      "PDF са почетним и крајњим стањем, графиконом салда, збировима по категоријама и свим трансакцијама изабраног периода.",
    "report.range.label": "Период извештаја",
    "report.range.custom": "Период",
    "report.field.from": "Од",
    "report.field.to": "До",
    "report.generate": "Направи PDF",
    "report.generating": "Прављење…",
    "report.error.invalidPeriod":
      "Унесите исправан период: почетни датум не сме бити после крајњег.",
    "report.error.generic": "Извештај није направљен. Покушајте поново.",
  },
  en: {
    "report.title": "Report",
    "report.description":
      "A PDF with opening and closing balances, a balance chart, totals by category and all transactions in the selected period.",
    "report.range.label": "Report period",
    "report.range.custom": "Custom",
    "report.field.from": "From",
    "report.field.to": "To",
    "report.generate": "Create PDF",
    "report.generating": "Creating…",
    "report.error.invalidPeriod":
      "Enter a valid period: the start date must not be after the end date.",
    "report.error.generic": "The report could not be created. Try again.",
  },
});
