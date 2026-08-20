// Application: хук за real-time листу фондова.

import { useEffect, useState } from "react";
import { subscribeFunds } from "@finance/infrastructure/FundRepository";
import type { Fund } from "@finance/domain/Fund";

export function useFundList(): Fund[] {
  const [funds, setFunds] = useState<Fund[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeFunds(setFunds);
    return unsubscribe;
  }, []);

  return funds;
}
