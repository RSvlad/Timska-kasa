// Application: хук за real-time листу фондова (дели се преко FinanceDataProvider-а).

import type { Fund } from "@finance/domain/Fund";
import type { Subscribed } from "./useSubscription";
import { useFinanceData } from "./FinanceDataProvider";

export function useFundList(): Subscribed<Fund> {
  return useFinanceData().funds;
}
