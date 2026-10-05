// Infrastructure: Upload/брисање слике рачуна у Firebase Storage.
// Путања: receipts/{recordId}/{filename} — видети storage.rules (само Admin write,
// сви allowed корисници read, ограничење величине и типа фајла на security-rules нивоу).

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { firebaseApp } from "@shared/infrastructure/firebase";

const storage = getStorage(firebaseApp);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, усклађено са storage.rules
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export class ReceiptValidationError extends Error {}

function assertValid(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ReceiptValidationError(
      "Дозвољени формати: JPEG, PNG, WEBP, HEIC."
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ReceiptValidationError("Слика не сме бити већа од 10MB.");
  }
}

/**
 * Отпрема слику рачуна за дати запис и враћа download URL и путању објекта.
 * Валидација се ради пре отпремања. Претходне рачуне треба обрисати тек након
 * успешног ажурирања записа, позивом `deleteReceipt(recordId, path)`.
 */
export async function uploadReceipt(
  recordId: string,
  file: File
): Promise<{ url: string; path: string }> {
  assertValid(file);
  const path = `receipts/${recordId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return { url: await getDownloadURL(storageRef), path };
}

/** Брише један објекат по путањи (повраћај након неуспелог ажурирања записа). */
export async function deleteReceiptObject(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

/**
 * Брише слике рачуна везане за дати запис. Ако је задат `keepPath`,
 * тај објекат се чува (нпр. управо отпремљена нова слика).
 */
export async function deleteReceipt(recordId: string, keepPath?: string): Promise<void> {
  const folderRef = ref(storage, `receipts/${recordId}`);
  const { items } = await listAll(folderRef);
  await Promise.all(
    items
      .filter((item) => item.fullPath !== keepPath)
      .map((item) => deleteObject(item))
  );
}
