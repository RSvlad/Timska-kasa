// Application: хук за real-time листу финансијских записа (дели се преко FinanceDataProvider-а).

import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Subscribed } from "./useSubscription";
import { useFinanceData } from "./FinanceDataProvider";

export function useRecordList(): Subscribed<FinanceRecord> {
  return useFinanceData().records;
}
