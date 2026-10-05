// Application: операције над финансијским записима (UI не сме директно да зове repository).

import {
  createFinanceRecord,
  updateFinanceRecord,
} from "@finance/infrastructure/FinanceRecordRepository";

export type { NewFinanceRecord } from "@finance/infrastructure/FinanceRecordRepository";

export const addRecord = createFinanceRecord;
export const editRecord = updateFinanceRecord;
