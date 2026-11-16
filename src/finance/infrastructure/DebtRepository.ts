// Infrastructure: Repository за Дуг (Firestore колекција `debts`).

import {
  addDoc,
  collection,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@shared/infrastructure/firebase";
import { omitUndefined } from "@shared/infrastructure/omitUndefined";
import { fromMinor, toMinor, type Amount } from "@finance/domain/Amount";
import { remainingOf, type Debt, type DebtDirection } from "@finance/domain/Debt";
import { DebtError } from "@finance/domain/DebtError";

const COLLECTION = "debts";

export type NewDebt = {
  direction: DebtDirection;
  counterparty: string;
  amount: Amount;
  description?: string;
  authorId: string;
};

export type DebtPatch = Partial<Pick<Debt, "counterparty" | "description" | "amount">>;

interface RepaymentDoc {
  value: number;
  dateTime: Timestamp;
  authorId: string;
}

type DebtDoc = Omit<Debt, "id" | "createdAt" | "repayments"> & {
  createdAt: Timestamp;
  repayments: RepaymentDoc[];
};

// Враћа null за неисправан документ да један лош дуг не сруши целу листу.
// Неисправан унос у историји отплата се прескаче; `paid` остаје извор истине.
function fromDoc(id: string, data: Partial<DebtDoc>): Debt | null {
  if (!(data.createdAt instanceof Timestamp)) {
    console.warn(`Дуг ${id} прескочен: недостаје или је неисправан createdAt.`);
    return null;
  }
  const repayments = (data.repayments ?? []).flatMap((r) => {
    if (!(r.dateTime instanceof Timestamp)) {
      console.warn(`Отплата дуга ${id} прескочена: неисправан dateTime.`);
      return [];
    }
    return [{ value: r.value, dateTime: r.dateTime.toDate(), authorId: r.authorId }];
  });
  return {
    ...(data as DebtDoc),
    id,
    createdAt: data.createdAt.toDate(),
    repayments,
  };
}

export function subscribeDebts(
  callback: (debts: Debt[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const ref = collection(db, COLLECTION);
  return onSnapshot(
    ref,
    (snapshot) => {
      const debts = snapshot.docs
        .map((d) => fromDoc(d.id, d.data() as Partial<DebtDoc>))
        .filter((d): d is Debt => d !== null);
      callback(debts);
    },
    (error) => onError?.(error),
  );
}

export async function createDebt(debt: NewDebt): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    ...omitUndefined(debt),
    paid: 0,
    repayments: [],
    active: true,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

// Атомарно бележи отплату (транзакција над свежим стањем документа): повећава `paid`
// и додаје ставку у историју, па истовремене измене или двоклик не дају изгубљена ажурирања.
export async function addDebtRepayment(id: string, value: number, authorId: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new DebtError({ code: "notFound" });
    const cur = snap.data() as Pick<DebtDoc, "amount" | "paid" | "repayments" | "active">;
    if (!cur.active) throw new DebtError({ code: "notActive" });
    const remaining = remainingOf(cur);
    if (toMinor(value) > toMinor(remaining)) {
      throw new DebtError({ code: "overpayment", remaining, currency: cur.amount.currency });
    }
    tx.update(ref, {
      paid: fromMinor(toMinor(cur.paid) + toMinor(value)),
      repayments: [...(cur.repayments ?? []), { value, dateTime: Timestamp.now(), authorId }],
    });
  });
}

export async function updateDebt(id: string, patch: DebtPatch): Promise<void> {
  const data: Record<string, unknown> = { ...patch };
  // `undefined` је недозвољен у updateDoc; за брисање опционог поља треба deleteField().
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) data[key] = deleteField();
  }
  const ref = doc(db, COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new DebtError({ code: "notFound" });
    const cur = snap.data() as Pick<DebtDoc, "amount" | "paid">;
    if (patch.amount) {
      const { currency } = cur.amount;
      if (patch.amount.currency !== currency && cur.paid > 0)
        throw new DebtError({ code: "currencyLocked", paid: cur.paid, currency });
      if (toMinor(patch.amount.value) < toMinor(cur.paid))
        throw new DebtError({
          code: "amountBelowPaid",
          paid: cur.paid,
          currency: patch.amount.currency,
        });
    }
    tx.update(ref, data);
  });
}

// Меко брисање (ADR-0004): дуг се поништава, не брише; историја остаје у бази.
export async function deactivateDebt(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { active: false });
}
