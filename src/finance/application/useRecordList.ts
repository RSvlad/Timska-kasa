// Application: хук за real-time листу финансијских записа.

import { subscribe } from "@finance/infrastructure/FinanceRecordRepository";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import { useSubscription, type Subscribed } from "./useSubscription";

export function useRecordList(): Subscribed<FinanceRecord> {
  return useSubscription(subscribe);
}
