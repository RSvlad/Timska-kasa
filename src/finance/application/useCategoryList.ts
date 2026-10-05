// Application: хук за real-time листу категорија (дели се преко FinanceDataProvider-а).
// Firestore детаљи остају у repository-ју.

import type { Category } from "@finance/domain/Category";
import type { Subscribed } from "./useSubscription";
import { useFinanceData } from "./FinanceDataProvider";

export function useCategoryList(): Subscribed<Category> {
  return useFinanceData().categories;
}
