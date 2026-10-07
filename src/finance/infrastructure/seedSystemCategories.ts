// Infrastructure: Иницијализација системских категорија.
// Позива се при пријави Admin корисника (видети AuthContext.tsx).
// Идемпотентно — не мења ништа ако документи већ постоје.
// `name` је језички неутралан резервни назив; приказ се преводи по ID-у (categoryLabel.ts).

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@shared/infrastructure/firebase";

interface SystemCategoryDef {
  id: string;
  name: string;
  type: "Приход" | "Расход";
}

export const SYSTEM_CATEGORIES: readonly SystemCategoryDef[] = [
  { id: "system-unknown-income", name: "Непознато", type: "Приход" },
  { id: "system-unknown-expense", name: "Непознато", type: "Расход" },
];

/**
 * Креира системске категорије ако не постоје.
 * Безбедно за вишеструко позивање (setDoc се не позива ако документ постоји).
 */
export async function seedSystemCategories(): Promise<void> {
  await Promise.all(
    SYSTEM_CATEGORIES.map(async ({ id, name, type }) => {
      const ref = doc(db, "categories", id);
      const snap = await getDoc(ref);
      if (snap.exists()) return;
      await setDoc(ref, { name, type, active: true, system: true });
    }),
  );
}
