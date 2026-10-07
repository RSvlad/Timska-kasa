// Application: оркестрира upload/уклањање слике рачуна за постојећи финансијски запис
// и синхронизацију `receiptUrl` поља у Firestore документу.

import { useState } from "react";
import {
  uploadReceipt,
  deleteReceipt,
  deleteReceiptObject,
} from "@finance/infrastructure/ReceiptStorage";
import {
  ReceiptValidationError,
  type ReceiptValidationDetail,
} from "@finance/domain/ReceiptValidationError";
import { updateFinanceRecord } from "@finance/infrastructure/FinanceRecordRepository";

/** Језички неутралан опис грешке; текст гради UI слој. */
export type ReceiptUploadError =
  | { code: "validation"; detail: ReceiptValidationDetail }
  | { code: "uploadFailed" }
  | { code: "removeFailed" };

interface UseReceiptUpload {
  uploading: boolean;
  error: ReceiptUploadError | null;
  attachReceipt: (recordId: string, file: File, hadPrevious?: boolean) => Promise<void>;
  removeReceipt: (recordId: string) => Promise<void>;
}

export function useReceiptUpload(): UseReceiptUpload {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<ReceiptUploadError | null>(null);

  async function attachReceipt(recordId: string, file: File, hadPrevious = false) {
    setError(null);
    setUploading(true);
    try {
      // Редослед: валидација + upload нове → ажурирање записа → брисање старе.
      // Грешка у било ком кораку никад не оставља запис без важеће слике.
      // Чува се само путања; стари `receiptUrl` (ако постоји) се уклања.
      const path = await uploadReceipt(recordId, file);
      try {
        await updateFinanceRecord(recordId, { receiptPath: path, receiptUrl: undefined });
      } catch (e) {
        await deleteReceiptObject(path).catch(() => {});
        throw e;
      }
      if (hadPrevious) {
        await deleteReceipt(recordId, path).catch(() => {});
      }
    } catch (e) {
      setError(
        e instanceof ReceiptValidationError
          ? { code: "validation", detail: e.detail }
          : { code: "uploadFailed" },
      );
      throw e;
    } finally {
      setUploading(false);
    }
  }

  async function removeReceipt(recordId: string) {
    setError(null);
    setUploading(true);
    try {
      await deleteReceipt(recordId);
      await updateFinanceRecord(recordId, { receiptPath: undefined, receiptUrl: undefined });
    } catch {
      setError({ code: "removeFailed" });
    } finally {
      setUploading(false);
    }
  }

  return { uploading, error, attachReceipt, removeReceipt };
}
