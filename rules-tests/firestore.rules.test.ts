import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { ADMIN, MEMBER, OUTSIDER, asUser, createEnv, seedAllowedUsers } from "./setup";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seedAllowedUsers(env);
});

const record = (over: Record<string, unknown> = {}) => ({
  type: "Приход",
  amount: { value: 100, currency: "RSD" },
  dateTime: Timestamp.now(),
  categoryId: "cat-1",
  counterparty: "Петар",
  authorId: ADMIN.uid,
  createdAt: Timestamp.now(),
  ...over,
});

const fund = (over: Record<string, unknown> = {}) => ({
  name: "Екскурзија",
  capacity: { value: 1000, currency: "RSD" },
  reserved: 0,
  createdAt: Timestamp.now(),
  ...over,
});

const category = (over: Record<string, unknown> = {}) => ({
  name: "Храна",
  type: "Расход",
  active: true,
  system: false,
  ...over,
});

async function seed(path: string, id: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path, id), data);
  });
}

describe("allowedUsers", () => {
  it("корисник чита само свој документ", async () => {
    const db = asUser(env, MEMBER).firestore();
    await assertSucceeds(getDoc(doc(db, "allowedUsers", MEMBER.email)));
    await assertFails(getDoc(doc(db, "allowedUsers", ADMIN.email)));
  });

  it("неверификован email не може да чита", async () => {
    const db = asUser(env, MEMBER, false).firestore();
    await assertFails(getDoc(doc(db, "allowedUsers", MEMBER.email)));
  });

  it("нико не може да пише", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertFails(setDoc(doc(db, "allowedUsers", "x@example.com"), { role: "Admin" }));
  });
});

describe("transactions", () => {
  it("анонимни и недозвољени корисници не читају", async () => {
    await seed("transactions", "t1", record());
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "transactions", "t1")));
    await assertFails(getDoc(doc(asUser(env, OUTSIDER).firestore(), "transactions", "t1")));
  });

  it("члан чита, али не пише", async () => {
    await seed("transactions", "t1", record());
    const db = asUser(env, MEMBER).firestore();
    await assertSucceeds(getDoc(doc(db, "transactions", "t1")));
    await assertFails(setDoc(doc(db, "transactions", "t2"), record({ authorId: MEMBER.uid })));
  });

  it("Admin креира валидан запис са својим authorId", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertSucceeds(setDoc(doc(db, "transactions", "t1"), record()));
  });

  it("одбија туђи authorId", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertFails(setDoc(doc(db, "transactions", "t1"), record({ authorId: "other" })));
  });

  it("одбија износ 0, негативан износ и погрешну валуту", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertFails(
      setDoc(doc(db, "transactions", "a"), record({ amount: { value: 0, currency: "RSD" } })),
    );
    await assertFails(
      setDoc(doc(db, "transactions", "b"), record({ amount: { value: -5, currency: "RSD" } })),
    );
    await assertFails(
      setDoc(doc(db, "transactions", "c"), record({ amount: { value: 5, currency: "rsd" } })),
    );
  });

  it("одбија непознато поље и невалидан тип", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertFails(setDoc(doc(db, "transactions", "a"), record({ extra: 1 })));
    await assertFails(setDoc(doc(db, "transactions", "b"), record({ type: "Остало" })));
  });

  it("fundId је дозвољен само за Расход", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertFails(setDoc(doc(db, "transactions", "a"), record({ fundId: "f1" })));
    await assertSucceeds(
      setDoc(doc(db, "transactions", "b"), record({ type: "Расход", fundId: "f1" })),
    );
  });

  it("receiptPath мора почети са receipts/", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertFails(setDoc(doc(db, "transactions", "a"), record({ receiptPath: "x/1.jpg" })));
    await assertSucceeds(
      setDoc(doc(db, "transactions", "b"), record({ receiptPath: "receipts/b/1.jpg" })),
    );
  });

  it("update не мења authorId/createdAt, али мења остало", async () => {
    await seed("transactions", "t1", record());
    const db = asUser(env, ADMIN).firestore();
    const ref = doc(db, "transactions", "t1");
    await assertSucceeds(updateDoc(ref, { counterparty: "Нико" }));
    await assertFails(updateDoc(ref, { authorId: "other" }));
    await assertFails(updateDoc(ref, { createdAt: Timestamp.fromMillis(1) }));
  });

  it("брисање је забрањено и за Admin", async () => {
    await seed("transactions", "t1", record());
    await assertFails(deleteDoc(doc(asUser(env, ADMIN).firestore(), "transactions", "t1")));
  });
});

describe("funds", () => {
  it("члан чита, не пише", async () => {
    await seed("funds", "f1", fund());
    const db = asUser(env, MEMBER).firestore();
    await assertSucceeds(getDoc(doc(db, "funds", "f1")));
    await assertFails(setDoc(doc(db, "funds", "f2"), fund()));
  });

  it("Admin креира само са reserved == 0", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertSucceeds(setDoc(doc(db, "funds", "f1"), fund()));
    await assertFails(setDoc(doc(db, "funds", "f2"), fund({ reserved: 10 })));
  });

  it("reserved не може да пређе capacity", async () => {
    await seed("funds", "f1", fund());
    const ref = doc(asUser(env, ADMIN).firestore(), "funds", "f1");
    await assertSucceeds(updateDoc(ref, { reserved: 1000 }));
    await assertFails(updateDoc(ref, { reserved: 1001 }));
  });

  it("createdAt је immutable", async () => {
    await seed("funds", "f1", fund());
    const ref = doc(asUser(env, ADMIN).firestore(), "funds", "f1");
    await assertFails(updateDoc(ref, { createdAt: Timestamp.fromMillis(1) }));
  });

  it("брисање само ако је reserved == 0", async () => {
    await seed("funds", "empty", fund());
    await seed("funds", "used", fund({ reserved: 50 }));
    const db = asUser(env, ADMIN).firestore();
    await assertSucceeds(deleteDoc(doc(db, "funds", "empty")));
    await assertFails(deleteDoc(doc(db, "funds", "used")));
  });
});

describe("categories", () => {
  it("члан чита, не пише; Admin креира", async () => {
    await seed("categories", "c1", category());
    await assertSucceeds(getDoc(doc(asUser(env, MEMBER).firestore(), "categories", "c1")));
    await assertFails(setDoc(doc(asUser(env, MEMBER).firestore(), "categories", "c2"), category()));
    await assertSucceeds(
      setDoc(doc(asUser(env, ADMIN).firestore(), "categories", "c2"), category()),
    );
  });

  it("system: true само за две сеедоване категорије", async () => {
    const db = asUser(env, ADMIN).firestore();
    const sys = category({ name: "Непознато", system: true });
    await assertSucceeds(setDoc(doc(db, "categories", "system-unknown-expense"), sys));
    await assertFails(setDoc(doc(db, "categories", "custom"), sys));
  });

  it("type и system су immutable", async () => {
    await seed("categories", "c1", category());
    const ref = doc(asUser(env, ADMIN).firestore(), "categories", "c1");
    await assertFails(updateDoc(ref, { type: "Приход" }));
    await assertFails(updateDoc(ref, { system: true }));
    await assertSucceeds(updateDoc(ref, { name: "Превоз", active: false }));
  });

  it("системској категорији се не мењају назив и активност", async () => {
    await seed(
      "categories",
      "system-unknown-expense",
      category({ name: "Непознато", system: true }),
    );
    const ref = doc(asUser(env, ADMIN).firestore(), "categories", "system-unknown-expense");
    await assertFails(updateDoc(ref, { name: "Друго" }));
    await assertFails(updateDoc(ref, { active: false }));
  });

  it("брисање је забрањено", async () => {
    await seed("categories", "c1", category());
    await assertFails(deleteDoc(doc(asUser(env, ADMIN).firestore(), "categories", "c1")));
  });
});
