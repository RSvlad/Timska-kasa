// Infrastructure: Repository за Фонд (Firestore колекција `funds`).

import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  Timestamp,
  deleteField,
  runTransaction,
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

// Атомарно мења `reserved` за `delta` (транзакција над свежим стањем документа),
// па истовремене измене или двоклик не дају изгубљена ажурирања.
// Инваријанте 0 ≤ reserved ≤ capacity.value проверавају се над свежим подацима.
export async function adjustFundReserved(id: string, delta: number): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Фонд не постоји.");
    const data = snap.data() as Pick<FundDoc, "reserved" | "capacity">;
    const next = data.reserved + delta;
    if (next < 0)
      throw new Error(
        `Не може се дезалоцирати ${-delta} — тренутно алоцирано само ${data.reserved} ${data.capacity.currency}.`
      );
    if (next > data.capacity.value)
      throw new Error(
        `Прелази капацитет фонда (макс. ${data.capacity.value - data.reserved} ${data.capacity.currency}).`
      );
    tx.update(ref, { reserved: next });
  });
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
  const ref = doc(db, COLLECTION, id);
  // Транзакција: инваријанте се проверавају над свежим стањем документа.
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Фонд не постоји.");
    const cur = snap.data() as Pick<FundDoc, "reserved" | "capacity">;
    if (patch.capacity) {
      if (patch.capacity.currency !== cur.capacity.currency && cur.reserved > 0)
        throw new Error(
          `Валута се не може мењати док је у фонду алоцирано ${cur.reserved} ${cur.capacity.currency}. Прво дезалоцирај.`
        );
      if (patch.capacity.value < cur.reserved)
        throw new Error(
          `Капацитет не може бити мањи од алоцираног износа (${cur.reserved} ${cur.capacity.currency}).`
        );
    }
    tx.update(ref, data);
  });
}

// Брише фонд само ако у њему нема алоцираног новца (транзакција над свежим стањем).
// Провера да ли записи референцирају фонд је на application слоју (removeFund).
export async function deleteFund(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const cur = snap.data() as Pick<FundDoc, "reserved" | "capacity">;
    if (cur.reserved > 0)
      throw new Error(
        `Фонд има алоцирано ${cur.reserved} ${cur.capacity.currency}. Прво дезалоцирај средства.`
      );
    tx.delete(ref);
  });
}
