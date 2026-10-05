// Infrastructure: Repository за Фонд (Firestore колекција `funds`).

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "@shared/infrastructure/firebase";
import { omitUndefined } from "@shared/infrastructure/omitUndefined";
import type { Fund } from "@finance/domain/Fund";
import type { Amount } from "@finance/domain/Amount";

const COLLECTION = "funds";

export type NewFund = {
  name: string;
  description?: string;
  capacity: Amount;
};

type FundDoc = Omit<Fund, "id" | "createdAt"> & { createdAt: Timestamp };

// Враћа null за неисправан документ да један лош фонд не сруши целу листу.
function fromDoc(id: string, data: Partial<FundDoc>): Fund | null {
  if (!(data.createdAt instanceof Timestamp)) {
    console.warn(`Фонд ${id} прескочен: недостаје или је неисправан createdAt.`);
    return null;
  }
  return {
    ...(data as FundDoc),
    id,
    createdAt: data.createdAt.toDate(),
  };
}

export function subscribeFunds(
  callback: (funds: Fund[]) => void,
  onError?: (error: Error) => void
): () => void {
  const ref = collection(db, COLLECTION);
  return onSnapshot(
    ref,
    (snapshot) => {
      const funds = snapshot.docs
        .map((d) => fromDoc(d.id, d.data() as Partial<FundDoc>))
        .filter((f): f is Fund => f !== null);
      callback(funds);
    },
    (error) => onError?.(error)
  );
}

export async function createFund(fund: NewFund): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    ...omitUndefined(fund),
    reserved: 0,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateFundReserved(id: string, reserved: number): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { reserved });
}

export async function updateFund(
  id: string,
  patch: Partial<Pick<Fund, "name" | "description" | "capacity">>
): Promise<void> {
  const data: Record<string, unknown> = { ...patch };
  // `undefined` је недозвољен у updateDoc; за брисање опционог поља треба deleteField().
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) data[key] = deleteField();
  }
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteFund(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
