// Application: извоз Извештаја у PDF (спаја чисту израду и инфраструктуру за PDF).

import type { Category } from "@finance/domain/Category";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Fund } from "@finance/domain/Fund";
import type { Period } from "@finance/domain/Period";
import { buildReport } from "@finance/application/reportService";
import { categoryLabel } from "@finance/application/categoryLabel";
import { downloadReportPdf } from "@finance/infrastructure/ReportPdfRenderer";
import type { Locale } from "@shared/i18n/locale";

export async function exportReportPdf(
  records: FinanceRecord[],
  categories: Category[],
  funds: Fund[],
  period: Period | null,
  locale: Locale,
): Promise<void> {
  const report = buildReport(records, categories, funds, period, new Date(), (category) =>
    categoryLabel(category, locale),
  );
  await downloadReportPdf(report, locale);
}
