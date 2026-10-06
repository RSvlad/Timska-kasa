import { readFileSync } from "node:fs";
import path from "node:path";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

const root = path.resolve(import.meta.dirname, "..");

export const ADMIN = { uid: "admin-uid", email: "admin@example.com" };
export const MEMBER = { uid: "member-uid", email: "member@example.com" };
export const OUTSIDER = { uid: "outsider-uid", email: "outsider@example.com" };

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: "demo-timska-kasa",
    firestore: { rules: readFileSync(path.join(root, "firestore.rules"), "utf8") },
    storage: { rules: readFileSync(path.join(root, "storage.rules"), "utf8") },
  });
}

/** Сеед: Admin и обичан члан су у allowedUsers; OUTSIDER није. */
export async function seedAllowedUsers(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "allowedUsers", ADMIN.email), { role: "Admin" });
    await setDoc(doc(db, "allowedUsers", MEMBER.email), { role: "Member" });
  });
}

export function asUser(
  env: RulesTestEnvironment,
  u: { uid: string; email: string },
  verified = true,
) {
  return env.authenticatedContext(u.uid, { email: u.email, email_verified: verified });
}
