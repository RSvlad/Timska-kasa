// Infrastructure: повезивање на Firebase емулаторе за e2e (само уз VITE_USE_EMULATORS=true).
// Google пријава преко искачућег прозора се у e2e не може аутоматизовати, па се
// излаже `window.__e2eSignIn` који пријављује налог креиран у Auth емулатору.

import { connectAuthEmulator, signInWithEmailAndPassword, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, type Firestore } from "firebase/firestore";

const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1";
const FIRESTORE_EMULATOR_PORT = 8080;

declare global {
  interface Window {
    __e2eSignIn?: (email: string, password: string) => Promise<void>;
  }
}

export function connectEmulators(auth: Auth, db: Firestore): void {
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  window.__e2eSignIn = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
}
