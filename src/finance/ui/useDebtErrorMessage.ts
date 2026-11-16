// UI: Претвара језички неутралну DebtError у текст на активном језику.

import { DebtError, type DebtErrorDetail } from "@finance/domain/DebtError";
import { useT } from "@shared/i18n/I18nProvider";
import type { MessageParams } from "@shared/i18n/messages";
import { useFormatters } from "@shared/i18n/useFormatters";
import { debtsMessages } from "@finance/ui/DebtsPage.messages";

type FormatAmount = (value: number, currency: string) => string;

export function debtErrorParams(detail: DebtErrorDetail, amount: FormatAmount): MessageParams {
  switch (detail.code) {
    case "amountNotPositive":
    case "notFound":
    case "notActive":
      return {};
    case "overpayment":
      return { remaining: amount(detail.remaining, detail.currency) };
    case "amountBelowPaid":
    case "currencyLocked":
      return { paid: amount(detail.paid, detail.currency) };
  }
}

export function useDebtErrorMessage() {
  const t = useT(debtsMessages);
  const fmt = useFormatters();

  return (error: unknown, fallbackKey: "debts.error.generic" | "debts.error.voidFailed") => {
    if (!(error instanceof DebtError)) return t(fallbackKey);
    const { detail } = error;
    return t(`debts.error.code.${detail.code}`, debtErrorParams(detail, fmt.amount));
  };
}
