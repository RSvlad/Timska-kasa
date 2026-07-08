// Infrastructure: Repository за Aggregate Root Финансијски запис (Firestore колекција `transactions`)
// Видети domain-model.md — нема delete, само create/update (audit trail).

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "@shared/infrastructure/firebase";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";

const COLLECTION = "transactions";

type NewFinanceRecord = Omit<FinanceRecord, "id" | "createdAt">;

// `authorId` и `createdAt` се не мењају после креирања (audit trail).
type FinanceRecordPatch = Partial<
  Omit<FinanceRecord, "id" | "authorId" | "createdAt">
>;

interface FinanceRecordDoc extends Omit<FinanceRecord, "id" | "dateTime" | "createdAt"> {
  dateTime: Timestamp;
  createdAt: Timestamp;
}

function fromDoc(id: string, data: FinanceRecordDoc): FinanceRecord {
  return {
    ...data,
    id,
    dateTime: data.dateTime.toDate(),
    createdAt: data.createdAt.toDate(),
  };
}

/**
 * Real-time претплата на колекцију финансијских записа. Враћа unsubscribe функцију.
 * Сакрива Firestore детаље (onSnapshot) од application/UI слоја.
 */
export function subscribe(callback: (records: FinanceRecord[]) => void): () => void {
  const ref = collection(db, COLLECTION);
  return onSnapshot(ref, (snapshot) => {
    const records = snapshot.docs.map((d) =>
      fromDoc(d.id, d.data() as FinanceRecordDoc)
    );
    callback(records);
  });
}

export async function createFinanceRecord(record: NewFinanceRecord): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    ...record,
    dateTime: Timestamp.fromDate(record.dateTime),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Ажурира финансијски запис (исправка грешке иде кроз update постојећег документа,
 * нема сторно/компензујуће записе). Баца грешку ако patch покуша да измени
 * `authorId` или `createdAt` — ове инваријанте чува repository.
 */
export async function updateFinanceRecord(
  id: string,
  patch: FinanceRecordPatch
): Promise<void> {
  if ("authorId" in patch || "createdAt" in patch) {
    throw new Error(
      "ФинансијскиЗапис: 'authorId' и 'createdAt' су immutable после креирања."
    );
  }
  const ref = doc(db, COLLECTION, id);
  const data: Record<string, unknown> = { ...patch };
  if (patch.dateTime) {
    data.dateTime = Timestamp.fromDate(patch.dateTime);
  }
  // `undefined` Firestore игнорише (поље остаје нетакнуто) — за експлицитно
  // брисање поља (нпр. уклањање receiptUrl) мора deleteField().
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) {
      data[key] = deleteField();
    }
  }
  await updateDoc(ref, data);
}
