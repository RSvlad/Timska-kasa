// Infrastructure: читање whitelist-а (Firestore колекција `allowedUsers`)
// Видети ADR-004, ADR-008, ADR-012.

import { doc, getDoc } from "firebase/firestore";
import { db } from "@shared/infrastructure/firebase";
import type { User, Role } from "@identity/domain/User";

interface AllowedUserDoc {
  role: Role;
}

/**
 * Враћа User на основу email-а (doc ID = email, видети ADR-012), уз Firebase UID
 * добијен из текуће auth сесије.
 * Враћа null ако корисник није на whitelist-у (нема приступ систему).
 */
export async function loadUser(uid: string, email: string): Promise<User | null> {
  const ref = doc(db, "allowedUsers", email.toLowerCase());
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as AllowedUserDoc;
  return {
    id: uid,
    email,
    role: data.role,
  };
}
