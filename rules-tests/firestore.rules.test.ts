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

const debt = (over: Record<string, unknown> = {}) => ({
  direction: "Потраживање",
  counterparty: "Марко",
  amount: { value: 1000, currency: "RSD" },
  paid: 0,
  repayments: [],
  active: true,
  authorId: ADMIN.uid,
  createdAt: Timestamp.now(),
  ...over,
});

const repayment = (value: number) => ({
  value,
  dateTime: Timestamp.now(),
  authorId: ADMIN.uid,
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

describe("debts", () => {
  it("члан чита, не пише", async () => {
    await seed("debts", "d1", debt());
    const db = asUser(env, MEMBER).firestore();
    await assertSucceeds(getDoc(doc(db, "debts", "d1")));
    await assertFails(setDoc(doc(db, "debts", "d2"), debt()));
    await assertFails(updateDoc(doc(db, "debts", "d1"), { counterparty: "Неко" }));
  });

  it("Admin креира само празан, активан дуг са својим authorId", async () => {
    const db = asUser(env, ADMIN).firestore();
    await assertSucceeds(setDoc(doc(db, "debts", "d1"), debt()));
    await assertSucceeds(setDoc(doc(db, "debts", "d2"), debt({ direction: "Обавеза" })));
    await assertFails(setDoc(doc(db, "debts", "d3"), debt({ paid: 10 })));
    await assertFails(setDoc(doc(db, "debts", "d4"), debt({ repayments: [repayment(10)] })));
    await assertFails(setDoc(doc(db, "debts", "d5"), debt({ active: false })));
    await assertFails(setDoc(doc(db, "debts", "d6"), debt({ authorId: "other-uid" })));
    await assertFails(setDoc(doc(db, "debts", "d7"), debt({ direction: "Позајмица" })));
    await assertFails(setDoc(doc(db, "debts", "d8"), debt({ counterparty: "" })));
    await assertFails(
      setDoc(doc(db, "debts", "d9"), debt({ amount: { value: 0, currency: "RSD" } })),
    );
  });

  it("отплата повећава paid уз тачно једну нову ставку историје", async () => {
    await seed("debts", "d1", debt());
    const ref = doc(asUser(env, ADMIN).firestore(), "debts", "d1");
    await assertSucceeds(updateDoc(ref, { paid: 400, repayments: [repayment(400)] }));
    await assertFails(updateDoc(ref, { paid: 500 }));
    await assertFails(
      updateDoc(ref, { paid: 500, repayments: [repayment(400), repayment(50), repayment(50)] }),
    );
  });

  it("paid не може пасти ни прећи износ дуга", async () => {
    await seed("debts", "d1", debt({ paid: 400, repayments: [repayment(400)] }));
    const ref = doc(asUser(env, ADMIN).firestore(), "debts", "d1");
    await assertFails(updateDoc(ref, { paid: 300 }));
    await assertFails(updateDoc(ref, { paid: 1001, repayments: [repayment(400), repayment(601)] }));
    await assertFails(updateDoc(ref, { amount: { value: 300, currency: "RSD" } }));
    await assertSucceeds(
      updateDoc(ref, { paid: 1000, repayments: [repayment(400), repayment(600)] }),
    );
  });

  it("direction, authorId и createdAt су immutable", async () => {
    await seed("debts", "d1", debt());
    const ref = doc(asUser(env, ADMIN).firestore(), "debts", "d1");
    await assertFails(updateDoc(ref, { direction: "Обавеза" }));
    await assertFails(updateDoc(ref, { authorId: "other-uid" }));
    await assertFails(updateDoc(ref, { createdAt: Timestamp.fromMillis(1) }));
  });

  it("валута се мења само пре прве отплате", async () => {
    await seed("debts", "fresh", debt());
    await seed("debts", "paid", debt({ paid: 10, repayments: [repayment(10)] }));
    const db = asUser(env, ADMIN).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "debts", "fresh"), { amount: { value: 1000, currency: "EUR" } }),
    );
    await assertFails(
      updateDoc(doc(db, "debts", "paid"), { amount: { value: 1000, currency: "EUR" } }),
    );
  });

  it("поништен дуг се не може отплаћивати, али се може поништити", async () => {
    await seed("debts", "inactive", debt({ active: false }));
    await seed("debts", "active", debt());
    const db = asUser(env, ADMIN).firestore();
    await assertFails(
      updateDoc(doc(db, "debts", "inactive"), { paid: 10, repayments: [repayment(10)] }),
    );
    await assertSucceeds(updateDoc(doc(db, "debts", "active"), { active: false }));
  });

  it("не може се обрисати", async () => {
    await seed("debts", "d1", debt());
    await assertFails(deleteDoc(doc(asUser(env, ADMIN).firestore(), "debts", "d1")));
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
