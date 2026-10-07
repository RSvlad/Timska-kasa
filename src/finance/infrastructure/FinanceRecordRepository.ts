// Infrastructure: Repository за Aggregate Root Финансијски запис (Firestore колекција `transactions`)
// Видети domain-model.md — нема delete, само create/update (audit trail).

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  Timestamp,
  deleteField,
  type Transaction,
} from "firebase/firestore";
import { db } from "@shared/infrastructure/firebase";
import { omitUndefined } from "@shared/infrastructure/omitUndefined";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import { FundChargeError } from "@finance/domain/FundChargeError";

const COLLECTION = "transactions";
const FUNDS_COLLECTION = "funds";

export type NewFinanceRecord = Omit<FinanceRecord, "id" | "createdAt">;

// `authorId` и `createdAt` се не мењају после креирања (audit trail).
type FinanceRecordPatch = Partial<Omit<FinanceRecord, "id" | "authorId" | "createdAt">>;

interface FinanceRecordDoc extends Omit<FinanceRecord, "id" | "dateTime" | "createdAt"> {
  dateTime: Timestamp;
  createdAt: Timestamp;
}

// Враћа null за неисправан документ (нпр. без `dateTime`) да један лош запис
// не сруши целу листу.
function fromDoc(id: string, data: Partial<FinanceRecordDoc>): FinanceRecord | null {
  if (!(data.dateTime instanceof Timestamp) || !(data.createdAt instanceof Timestamp)) {
    console.warn(`Запис ${id} прескочен: недостаје или је неисправан dateTime/createdAt.`);
    return null;
  }
  return {
    ...(data as FinanceRecordDoc),
    id,
    dateTime: data.dateTime.toDate(),
    createdAt: data.createdAt.toDate(),
  };
}

/**
 * Real-time претплата на колекцију финансијских записа. Враћа unsubscribe функцију.
 * Сакрива Firestore детаље (onSnapshot) од application/UI слоја.
 */
export function subscribe(
  callback: (records: FinanceRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const ref = collection(db, COLLECTION);
  return onSnapshot(
    ref,
    (snapshot) => {
      const records = snapshot.docs
        .map((d) => fromDoc(d.id, d.data() as Partial<FinanceRecordDoc>))
        .filter((r): r is FinanceRecord => r !== null);
      callback(records);
    },
    (error) => onError?.(error),
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface FundCharge {
  type: FinanceRecord["type"];
  amount: FinanceRecord["amount"];
  fundId?: string;
}

// Само Расход са fundId терети фонд (смањује `reserved`); Приход са fundId није дозвољен.
function chargeOf(r: FundCharge): { fundId: string; value: number } | null {
  if (!r.fundId) return null;
  if (r.type !== "Расход") throw new FundChargeError({ code: "expenseOnly" });
  return { fundId: r.fundId, value: r.amount.value };
}

/**
 * Примењује промену `reserved` на фондове унутар транзакције: `release` враћа
 * претходно терећење (измена записа), `charge` примењује ново. Сва читања су
 * пре било ког писања (захтев Firestore транзакције).
 */
async function applyFundCharges(
  tx: Transaction,
  release: { fundId: string; value: number } | null,
  charge: { fundId: string; value: number } | null,
  currency: string,
): Promise<void> {
  const deltas = new Map<string, number>();
  if (release) deltas.set(release.fundId, (deltas.get(release.fundId) ?? 0) + release.value);
  if (charge) deltas.set(charge.fundId, (deltas.get(charge.fundId) ?? 0) - charge.value);

  const loaded = await Promise.all(
    [...deltas.entries()].map(async ([fundId, delta]) => {
      const ref = doc(db, FUNDS_COLLECTION, fundId);
      return { ref, delta, isCharge: charge?.fundId === fundId, snap: await tx.get(ref) };
    }),
  );

  for (const { ref, delta, isCharge, snap } of loaded) {
    if (delta === 0) continue;
    if (!snap.exists()) throw new FundChargeError({ code: "fundNotFound" });
    const f = snap.data() as { reserved: number; capacity: { value: number; currency: string } };
    if (isCharge && f.capacity.currency !== currency)
      throw new FundChargeError({ code: "currencyMismatch", currency: f.capacity.currency });
    const next = round2(f.reserved + delta);
    if (next < 0)
      throw new FundChargeError({
        code: "insufficientReserved",
        reserved: f.reserved,
        currency: f.capacity.currency,
      });
    if (next > f.capacity.value) throw new FundChargeError({ code: "capacityExceeded" });
    tx.update(ref, { reserved: next });
  }
}

export async function createFinanceRecord(record: NewFinanceRecord): Promise<string> {
  const recordRef = doc(collection(db, COLLECTION));
  const charge = chargeOf(record);
  await runTransaction(db, async (tx) => {
    await applyFundCharges(tx, null, charge, record.amount.currency);
    tx.set(recordRef, {
      ...omitUndefined(record),
      dateTime: Timestamp.fromDate(record.dateTime),
      createdAt: Timestamp.now(),
    });
  });
  return recordRef.id;
}

/**
 * Ажурира финансијски запис (исправка грешке иде кроз update постојећег документа,
 * нема сторно/компензујуће записе). Баца грешку ако patch покуша да измени
 * `authorId` или `createdAt` — ове инваријанте чува repository.
 * Терећење фонда (`fundId`) се атомарно усклађује: старо се враћа, ново примењује.
 */
export async function updateFinanceRecord(id: string, patch: FinanceRecordPatch): Promise<void> {
  if ("authorId" in patch || "createdAt" in patch) {
    throw new Error("FinanceRecord: 'authorId' and 'createdAt' are immutable after creation.");
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
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("FinanceRecord not found.");
    const old = snap.data() as FinanceRecordDoc;
    const next: FundCharge = {
      type: patch.type ?? old.type,
      amount: patch.amount ?? old.amount,
      fundId: "fundId" in patch ? patch.fundId : old.fundId,
    };
    await applyFundCharges(tx, chargeOf(old), chargeOf(next), next.amount.currency);
    tx.update(ref, data);
  });
}
