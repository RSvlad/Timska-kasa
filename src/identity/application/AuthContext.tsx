// Application: AuthContext — повезује Firebase Auth сесију са домен моделом User.
// Корисник без whitelist уноса нема приступ (null role → приступ одбијен у UI).

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "@shared/infrastructure/firebase";
import { loadUser } from "@identity/infrastructure/UserRepository";
import { seedSystemCategories } from "@finance/infrastructure/seedSystemCategories";
import type { User } from "@identity/domain/User";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Пријављен Google налог који није на whitelist-и (email за приказ). */
  deniedEmail: string | null;
  /** Порука о грешци при пријави/учитавању; null ако нема грешке. */
  error: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Корисник је сам затворио/отказао прозор — није грешка коју треба приказати.
const SILENT_SIGN_IN_ERRORS = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser || !firebaseUser.email) {
          setUser(null);
          setDeniedEmail(null);
          return;
        }

        const loaded = await loadUser(firebaseUser.uid, firebaseUser.email);

        if (loaded?.role === "Admin") {
          // Идемпотентно — прескаче ако категорије већ постоје.
          await seedSystemCategories();
        }

        setUser(loaded);
        // Сесија остаје активна да би се могла видети порука и одјавити.
        setDeniedEmail(loaded ? null : firebaseUser.email);
        setError(null);
      } catch (e) {
        console.error("Грешка при учитавању корисника", e);
        setUser(null);
        setDeniedEmail(null);
        setError("Учитавање налога није успело. Покушајте поново.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function signIn() {
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (SILENT_SIGN_IN_ERRORS.has(code)) return;
      console.error("Грешка при пријави", e);
      setError(
        code === "auth/popup-blocked"
          ? "Прегледач је блокирао прозор за пријаву. Дозволите искачуће прозоре."
          : "Пријава није успела. Покушајте поново."
      );
    }
  }

  async function signOutUser() {
    setError(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Грешка при одјави", e);
      setError("Одјава није успела. Покушајте поново.");
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, deniedEmail, error, signIn, signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth мора бити позван унутар AuthProvider-а");
  }
  return context;
}
