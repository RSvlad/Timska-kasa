// Иницијализација Firebase App-а, Auth-а, Firestore-а и (опционо) Analytics-а.
// Конфигурација долази искључиво из env променљивих (Vite import.meta.env).
// Видети .env.example за потребне кључеве.

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { connectEmulators } from "@shared/infrastructure/emulators";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectEmulators(auth, db);
}

// Analytics је опционо: иницијализује се само ако је measurementId задат и
// ако окружење то подржава (нпр. не у e2e/SSR/блокираним колачићима).
if (firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(firebaseApp);
    })
    .catch(() => {
      // Analytics не сме да омете рад апликације.
    });
}
