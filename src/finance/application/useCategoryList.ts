// Application: хук за real-time листу категорија.
// Претплата живи колико и компонента; Firestore детаљи остају у repository-ју.

import { subscribe } from "@finance/infrastructure/CategoryRepository";
import type { Category } from "@finance/domain/Category";
import { useSubscription, type Subscribed } from "./useSubscription";

export function useCategoryList(): Subscribed<Category> {
  return useSubscription(subscribe);
}
