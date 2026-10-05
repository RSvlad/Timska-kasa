// Application: заједнички хук за real-time претплату са loading/error стањем.

import { useEffect, useState } from "react";

export interface Subscribed<T> {
  data: T[];
  /** true до првог snapshot-а (или до грешке). */
  loading: boolean;
  /** Грешка претплате (нпр. permission-denied); data остаје последња позната вредност. */
  error: Error | null;
}

export type SubscribeFn<T> = (
  onData: (items: T[]) => void,
  onError: (error: Error) => void,
) => () => void;

export function useSubscription<T>(subscribe: SubscribeFn<T>): Subscribed<T> {
  const [state, setState] = useState<Subscribed<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    return subscribe(
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [subscribe]);

  return state;
}
