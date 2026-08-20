// Infrastructure: Repository за Фонд (Firestore колекција `funds`).

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@shared/infrastructure/firebase";
import type { Fund } from "@finance/domain/Fund";
import type { Amount } from "@finance/domain/Amount";

const COLLECTION = "funds";

export type NewFund = {
  name: string;
  description?: string;
  capacity: Amount;
};

type FundDoc = Omit<Fund, "id" | "createdAt"> & { createdAt: Timestamp };

function fromDoc(id: string, data: FundDoc): Fund {
  return {
    ...data,
    id,
    createdAt: data.createdAt.toDate(),
  };
}

export function subscribeFunds(callback: (funds: Fund[]) => void): () => void {
  const ref = collection(db, COLLECTION);
  return onSnapshot(ref, (snapshot) => {
    const funds = snapshot.docs.map((d) => fromDoc(d.id, d.data() as FundDoc));
    callback(funds);
  });
}

export async function createFund(fund: NewFund): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    ...fund,
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
  await updateDoc(doc(db, COLLECTION, id), patch);
}

export async function deleteFund(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
