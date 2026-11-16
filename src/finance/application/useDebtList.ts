// Application: хук за real-time листу дугова (дели се преко FinanceDataProvider-а).

import type { Debt } from "@finance/domain/Debt";
import type { Subscribed } from "./useSubscription";
import { useFinanceData } from "./FinanceDataProvider";

export function useDebtList(): Subscribed<Debt> {
  return useFinanceData().debts;
}
