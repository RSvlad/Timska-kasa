// Application: оркестрира upload/уклањање слике рачуна за постојећи финансијски запис
// и синхронизацију `receiptUrl` поља у Firestore документу.

import { useState } from "react";
import {
  uploadReceipt,
  deleteReceipt,
  deleteReceiptObject,
  ReceiptValidationError,
} from "@finance/infrastructure/ReceiptStorage";
import { updateFinanceRecord } from "@finance/infrastructure/FinanceRecordRepository";

interface UseReceiptUpload {
  uploading: boolean;
  error: string;
  attachReceipt: (recordId: string, file: File, previousUrl?: string) => Promise<void>;
  removeReceipt: (recordId: string) => Promise<void>;
}

export function useReceiptUpload(): UseReceiptUpload {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function attachReceipt(recordId: string, file: File, previousUrl?: string) {
    setError("");
    setUploading(true);
    try {
      // Редослед: валидација + upload нове → ажурирање записа → брисање старе.
      // Грешка у било ком кораку никад не оставља запис без важеће слике.
      const { url, path } = await uploadReceipt(recordId, file);
      try {
        await updateFinanceRecord(recordId, { receiptUrl: url });
      } catch (e) {
        await deleteReceiptObject(path).catch(() => {});
        throw e;
      }
      if (previousUrl) {
        await deleteReceipt(recordId, path).catch(() => {});
      }
    } catch (e) {
      setError(
        e instanceof ReceiptValidationError
          ? e.message
          : "Слика није отпремљена. Покушајте поново."
      );
      throw e;
    } finally {
      setUploading(false);
    }
  }

  async function removeReceipt(recordId: string) {
    setError("");
    setUploading(true);
    try {
      await deleteReceipt(recordId);
      await updateFinanceRecord(recordId, { receiptUrl: undefined });
    } catch {
      setError("Рачун није уклоњен. Покушајте поново.");
    } finally {
      setUploading(false);
    }
  }

  return { uploading, error, attachReceipt, removeReceipt };
}
