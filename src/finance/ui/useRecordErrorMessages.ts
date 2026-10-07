// UI: Претвара језички неутралне грешке записа и рачуна у текст на активном језику.

import type { FundChargeErrorDetail } from "@finance/domain/FundChargeError";
import type { ReceiptUploadError } from "@finance/application/useReceiptUpload";
import { useT } from "@shared/i18n/I18nProvider";
import { useFormatters } from "@shared/i18n/useFormatters";
import { recordsMessages } from "@finance/ui/RecordList.messages";

export function useFundChargeErrorMessage() {
  const t = useT(recordsMessages);
  const fmt = useFormatters();

  return (detail: FundChargeErrorDetail): string => {
    switch (detail.code) {
      case "currencyMismatch":
        return t("records.error.fundCharge.currencyMismatch", { currency: detail.currency });
      case "insufficientReserved":
        return t("records.error.fundCharge.insufficientReserved", {
          reserved: fmt.amount(detail.reserved, detail.currency),
        });
      case "expenseOnly":
        return t("records.error.fundCharge.expenseOnly");
      case "fundNotFound":
        return t("records.error.fundCharge.fundNotFound");
      case "capacityExceeded":
        return t("records.error.fundCharge.capacityExceeded");
    }
  };
}

export function useReceiptErrorMessage() {
  const t = useT(recordsMessages);

  return (error: ReceiptUploadError): string => {
    switch (error.code) {
      case "validation":
        return error.detail.code === "tooLarge"
          ? t("records.error.receipt.tooLarge", { maxMb: error.detail.maxMb })
          : t("records.error.receipt.unsupportedFormat");
      case "uploadFailed":
        return t("records.error.receipt.uploadFailed");
      case "removeFailed":
        return t("records.error.receipt.removeFailed");
    }
  };
}
