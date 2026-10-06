const PROJECT = "demo-timska-kasa";
const AUTH_URL = "http://127.0.0.1:9099";
const FIRESTORE_URL = "http://127.0.0.1:8080";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

export const ADMIN = { email: "admin@example.com", password: "e2e-password-1" };

type Field =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { doubleValue: number }
  | { timestampValue: string }
  | { mapValue: { fields: Record<string, Field> } };

const str = (stringValue: string): Field => ({ stringValue });
const bool = (booleanValue: boolean): Field => ({ booleanValue });
const ts = (date: Date): Field => ({ timestampValue: date.toISOString() });
const amount = (value: number, currency: string): Field => ({
  mapValue: { fields: { value: { doubleValue: value }, currency: str(currency) } },
});

async function send(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${init.method} ${url} → ${response.status}`);
  return response;
}

async function putDocument(
  collection: string,
  id: string,
  fields: Record<string, Field>,
): Promise<void> {
  await send(
    `${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${id}`,
    { method: "PATCH", headers: OWNER, body: JSON.stringify({ fields }) },
  );
}

export async function resetEmulators(): Promise<void> {
  await send(`${AUTH_URL}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await send(`${FIRESTORE_URL}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: "DELETE",
  });
}

export async function createVerifiedAdmin(): Promise<void> {
  const signUp = await send(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2e-api-key`,
    { method: "POST", headers: OWNER, body: JSON.stringify({ ...ADMIN, returnSecureToken: true }) },
  );
  const { localId } = (await signUp.json()) as { localId: string };
  await send(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: "POST",
    headers: OWNER,
    body: JSON.stringify({ localId, emailVerified: true }),
  });
  await putDocument("allowedUsers", ADMIN.email, { role: str("Admin") });
}

export async function seedCategory(id: string, name: string, type: string): Promise<void> {
  await putDocument("categories", id, {
    name: str(name),
    type: str(type),
    active: bool(true),
    system: bool(false),
  });
}

export interface SeedRecord {
  id: string;
  type: "Приход" | "Расход";
  value: number;
  currency: string;
  dateTime: Date;
  categoryId: string;
  counterparty: string;
}

export async function seedRecord(record: SeedRecord): Promise<void> {
  await putDocument("transactions", record.id, {
    type: str(record.type),
    amount: amount(record.value, record.currency),
    dateTime: ts(record.dateTime),
    categoryId: str(record.categoryId),
    counterparty: str(record.counterparty),
    authorId: str("seed"),
    createdAt: ts(new Date()),
  });
}
