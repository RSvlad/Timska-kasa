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
import { ReceiptValidationError } from "@finance/domain/ReceiptValidationError";

const storage = getStorage(firebaseApp);

const MAX_SIZE_MB = 10; // усклађено са storage.rules
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heic", // storage.rules прихвата само image/heic
};

/** `File.type` је за HEIC на неким прегледачима/ОС празан (или image/heif): тип се изводи из екстензије. */
function resolveContentType(file: File): string {
  if (ALLOWED_TYPES.includes(file.type)) return file.type;
  if (file.type === "image/heif") return "image/heic";
  if (file.type) return file.type; // непознат тип → одбија assertValid
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? "";
}

function assertValid(file: File): void {
  if (!ALLOWED_TYPES.includes(resolveContentType(file))) {
    throw new ReceiptValidationError({ code: "unsupportedFormat" });
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ReceiptValidationError({ code: "tooLarge", maxMb: MAX_SIZE_MB });
  }
}

/** Уклања из имена фајла све осим слова, цифара, тачке, доње црте и цртице (без `/`, `..`). */
function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._]+/, "")
    .slice(-100);
  return cleaned || "receipt";
}

/**
 * Отпрема слику рачуна за дати запис и враћа путању објекта (чува се у запису;
 * download URL се не чува, већ се добија на захтев преко `resolveReceiptUrl`).
 * Валидација се ради пре отпремања. Претходне рачуне треба обрисати тек након
 * успешног ажурирања записа, позивом `deleteReceipt(recordId, path)`.
 */
export async function uploadReceipt(recordId: string, file: File): Promise<string> {
  assertValid(file);
  const path = `receipts/${recordId}/${Date.now()}_${sanitizeFileName(file.name)}`;
  await uploadBytes(ref(storage, path), file, { contentType: resolveContentType(file) });
  return path;
}

/**
 * Добија download URL на захтев (захтева read дозволу из storage.rules).
 * Прихвата путању објекта или стари трајни download URL (`ref()` разуме оба).
 */
export function resolveReceiptUrl(pathOrLegacyUrl: string): Promise<string> {
  return getDownloadURL(ref(storage, pathOrLegacyUrl));
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
    items.filter((item) => item.fullPath !== keepPath).map((item) => deleteObject(item)),
  );
}
