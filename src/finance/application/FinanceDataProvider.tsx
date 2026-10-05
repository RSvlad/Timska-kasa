// Application: једна real-time претплата по колекцији, подељена свим компонентама.
// Монтира се само за пријављеног корисника (rules захтевају аутентификацију).

import { createContext, useContext, type ReactNode } from "react";
import { subscribe as subscribeRecords } from "@finance/infrastructure/FinanceRecordRepository";
import { subscribeFunds } from "@finance/infrastructure/FundRepository";
import { subscribe as subscribeCategories } from "@finance/infrastructure/CategoryRepository";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Fund } from "@finance/domain/Fund";
import type { Category } from "@finance/domain/Category";
import { useSubscription, type Subscribed } from "./useSubscription";

interface FinanceData {
  records: Subscribed<FinanceRecord>;
  funds: Subscribed<Fund>;
  categories: Subscribed<Category>;
}

const FinanceDataContext = createContext<FinanceData | null>(null);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const records = useSubscription(subscribeRecords);
  const funds = useSubscription(subscribeFunds);
  const categories = useSubscription(subscribeCategories);

  return (
    <FinanceDataContext.Provider value={{ records, funds, categories }}>
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData(): FinanceData {
  const ctx = useContext(FinanceDataContext);
  if (!ctx) throw new Error("useFinanceData мора бити унутар FinanceDataProvider-а");
  return ctx;
}
