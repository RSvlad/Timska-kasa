// Application: приступ слици рачуна. У запису се чува само путања (`receiptPath`),
// а download URL се добија на захтев; стари записи користе `receiptUrl`.

import { useEffect, useState } from "react";
import { resolveReceiptUrl } from "@finance/infrastructure/ReceiptStorage";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";

/** Извор слике рачуна: нова путања има предност над старим трајним URL-ом. */
export function receiptSource(
  r: Pick<FinanceRecord, "receiptPath" | "receiptUrl">,
): string | undefined {
  return r.receiptPath ?? r.receiptUrl;
}

/** Добија download URL за приказ (нпр. умањена слика). `null` док се учитава или при грешци. */
export function useReceiptUrl(source: string | undefined): string | null {
  const [resolved, setResolved] = useState<{ source: string; url: string } | null>(null);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    resolveReceiptUrl(source)
      .then((url) => {
        if (!cancelled) setResolved({ source, url });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [source]);

  return source && resolved?.source === source ? resolved.url : null;
}

/**
 * Отвара рачун у новом табу. Таб се отвара синхроно (ради блокатора искачућих
 * прозора), па се тек након добијања URL-а усмерава на слику.
 */
export async function openReceipt(source: string): Promise<void> {
  const tab = window.open("", "_blank");
  try {
    const url = await resolveReceiptUrl(source);
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch {
    tab?.close();
    throw new Error("Рачун није могуће отворити.");
  }
}
