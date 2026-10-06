import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
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
  await env.clearStorage();
  await seedAllowedUsers(env);
});

const PATH = "receipts/rec1/photo.jpg";
const bytes = (n = 16) => new Uint8Array(n);
const jpeg = { contentType: "image/jpeg" };

async function seedFile() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), PATH), bytes(), jpeg);
  });
}

describe("storage receipts", () => {
  it("Admin отпрема валидну слику", async () => {
    const st = asUser(env, ADMIN).storage();
    await assertSucceeds(uploadBytes(ref(st, PATH), bytes(), jpeg));
  });

  it("члан и недозвољени корисник не отпремају", async () => {
    await assertFails(uploadBytes(ref(asUser(env, MEMBER).storage(), PATH), bytes(), jpeg));
    await assertFails(uploadBytes(ref(asUser(env, OUTSIDER).storage(), PATH), bytes(), jpeg));
    await assertFails(
      uploadBytes(ref(env.unauthenticatedContext().storage(), PATH), bytes(), jpeg),
    );
  });

  it("одбија неслику и превелик фајл", async () => {
    const st = asUser(env, ADMIN).storage();
    await assertFails(uploadBytes(ref(st, PATH), bytes(), { contentType: "application/pdf" }));
    await assertFails(uploadBytes(ref(st, PATH), bytes(10 * 1024 * 1024 + 1), jpeg));
  });

  it("неверификован Admin не отпрема", async () => {
    const st = asUser(env, ADMIN, false).storage();
    await assertFails(uploadBytes(ref(st, PATH), bytes(), jpeg));
  });

  it("члан и Admin читају, недозвољени не", async () => {
    await seedFile();
    await assertSucceeds(getBytes(ref(asUser(env, MEMBER).storage(), PATH)));
    await assertSucceeds(getBytes(ref(asUser(env, ADMIN).storage(), PATH)));
    await assertFails(getBytes(ref(asUser(env, OUTSIDER).storage(), PATH)));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), PATH)));
  });

  it("брише само Admin", async () => {
    await seedFile();
    await assertFails(deleteObject(ref(asUser(env, MEMBER).storage(), PATH)));
    await assertSucceeds(deleteObject(ref(asUser(env, ADMIN).storage(), PATH)));
  });

  it("путање ван receipts/ су забрањене", async () => {
    const st = asUser(env, ADMIN).storage();
    await assertFails(uploadBytes(ref(st, "other/file.jpg"), bytes(), jpeg));
  });
});
