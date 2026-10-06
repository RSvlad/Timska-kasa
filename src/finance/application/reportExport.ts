// Application: извоз Извештаја у PDF (спаја чисту израду и инфраструктуру за PDF).

import type { Category } from "@finance/domain/Category";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Fund } from "@finance/domain/Fund";
import type { Period } from "@finance/domain/Period";
import { buildReport } from "@finance/application/reportService";
import { downloadReportPdf } from "@finance/infrastructure/ReportPdfRenderer";

export async function exportReportPdf(
  records: FinanceRecord[],
  categories: Category[],
  funds: Fund[],
  period: Period | null,
): Promise<void> {
  await downloadReportPdf(buildReport(records, categories, funds, period));
}
