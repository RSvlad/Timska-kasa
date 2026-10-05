// Infrastructure: Repository за Entity Категорија (Firestore колекција `categories`)
// Видети ADR-010 (CRUD, меко брисање, заштита системске категорије).

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@shared/infrastructure/firebase";
import type { Category } from "@finance/domain/Category";

const COLLECTION = "categories";

type NewCategory = Omit<Category, "id">;

// Поља која се не могу мењати после креирања:
// - type: тип категорије је immutable
// - system: заставица се не мења кроз update (штити „Непознато")
type CategoryPatch = Partial<Omit<Category, "id" | "type" | "system">>;

/**
 * Real-time претплата на колекцију категорија. Враћа unsubscribe функцију.
 * Сакрива Firestore детаље (onSnapshot) од application/UI слоја.
 */
export function subscribe(callback: (categories: Category[]) => void): () => void {
  const ref = collection(db, COLLECTION);
  return onSnapshot(ref, (snapshot) => {
    const categories = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Category)
    );
    callback(categories);
  });
}

export async function createCategory(category: NewCategory): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, category);
  return docRef.id;
}

/**
 * Ажурира категорију. Баца грешку ако patch покуша да измени `type` или `system`
 * — ове инваријанте чува repository (видети domain-model.md).
 */
export async function updateCategory(id: string, patch: CategoryPatch): Promise<void> {
  if ("type" in patch || "system" in patch) {
    throw new Error("Категорија: 'type' и 'system' су immutable после креирања.");
  }
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, patch);
}
