// UI: Претвара језички неутралну FundError у текст на активном језику.

import { FundError, type FundErrorDetail } from "@finance/domain/FundError";
import { useT } from "@shared/i18n/I18nProvider";
import type { MessageParams } from "@shared/i18n/messages";
import { useFormatters } from "@shared/i18n/useFormatters";
import { fundsMessages } from "@finance/ui/FundsPage.messages";

type FormatAmount = (value: number, currency: string) => string;

export function fundErrorParams(detail: FundErrorDetail, amount: FormatAmount): MessageParams {
  switch (detail.code) {
    case "amountNotPositive":
    case "notFound":
      return {};
    case "capacityExceeded":
      return { max: amount(detail.max, detail.currency) };
    case "insufficientFreeFunds":
      return { free: amount(detail.free, detail.currency) };
    case "insufficientReserved":
      return {
        requested: amount(detail.requested, detail.currency),
        reserved: amount(detail.reserved, detail.currency),
      };
    case "currencyLocked":
    case "capacityBelowReserved":
    case "hasReserved":
      return { reserved: amount(detail.reserved, detail.currency) };
    case "referencedByRecords":
      return { count: detail.count };
  }
}

export function useFundErrorMessage() {
  const t = useT(fundsMessages);
  const fmt = useFormatters();

  return (error: unknown, fallbackKey: "funds.error.generic" | "funds.error.deleteFailed") => {
    if (!(error instanceof FundError)) return t(fallbackKey);
    const { detail } = error;
    return t(`funds.error.code.${detail.code}`, fundErrorParams(detail, fmt.amount));
  };
}
