import type { Page } from "@playwright/test";

const PROJECT = "demo-timska-kasa";
const AUTH_URL = "http://127.0.0.1:9099";
const FIRESTORE_URL = "http://127.0.0.1:8080";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

export const ADMIN = { email: "admin@example.com", password: "e2e-password-1" };
export const VIEWER = { email: "viewer@example.com", password: "e2e-password-2" };

type Account = { email: string; password: string };

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

async function createVerifiedUser(account: Account, role: "Admin" | "Viewer"): Promise<void> {
  const signUp = await send(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2e-api-key`,
    {
      method: "POST",
      headers: OWNER,
      body: JSON.stringify({ ...account, returnSecureToken: true }),
    },
  );
  const { localId } = (await signUp.json()) as { localId: string };
  await send(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: "POST",
    headers: OWNER,
    body: JSON.stringify({ localId, emailVerified: true }),
  });
  await putDocument("allowedUsers", account.email, { role: str(role) });
}

export const createVerifiedAdmin = (): Promise<void> => createVerifiedUser(ADMIN, "Admin");

export const createVerifiedViewer = (): Promise<void> => createVerifiedUser(VIEWER, "Viewer");

export async function seedCategory(
  id: string,
  name: string,
  type: string,
  active = true,
): Promise<void> {
  await putDocument("categories", id, {
    name: str(name),
    type: str(type),
    active: bool(active),
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
  receiptPath?: string;
}

export async function seedRecord(record: SeedRecord): Promise<void> {
  await putDocument("transactions", record.id, {
    type: str(record.type),
    amount: amount(record.value, record.currency),
    dateTime: ts(record.dateTime),
    categoryId: str(record.categoryId),
    counterparty: str(record.counterparty),
    authorId: str("seed"),
    ...(record.receiptPath ? { receiptPath: str(record.receiptPath) } : {}),
    createdAt: ts(new Date()),
  });
}

export interface SeedFund {
  id: string;
  name: string;
  value: number;
  currency: string;
  reserved: number;
}

export async function seedFund(fund: SeedFund): Promise<void> {
  await putDocument("funds", fund.id, {
    name: str(fund.name),
    capacity: amount(fund.value, fund.currency),
    reserved: { doubleValue: fund.reserved },
    createdAt: ts(new Date()),
  });
}

export async function signIn(page: Page, account: Account = ADMIN): Promise<void> {
  await page.goto("./");
  await page.waitForFunction(() => "__e2eSignIn" in window);
  await page.evaluate(
    ([email, password]) =>
      (window as unknown as { __e2eSignIn: (e: string, p: string) => Promise<void> }).__e2eSignIn(
        email,
        password,
      ),
    [account.email, account.password],
  );
}
