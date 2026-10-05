// Application: хук за real-time листу фондова.

import { subscribeFunds } from "@finance/infrastructure/FundRepository";
import type { Fund } from "@finance/domain/Fund";
import { useSubscription, type Subscribed } from "./useSubscription";

export function useFundList(): Subscribed<Fund> {
  return useSubscription(subscribeFunds);
}
