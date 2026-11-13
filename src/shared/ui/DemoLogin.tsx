// Демо пријава: приказује се само уз VITE_USE_EMULATORS=true (`npm run dev:demo`).
// Google искачући прозор не ради са сидованим email/lozinka налозима, па се
// пријављујемо директно у Auth емулатор.

import { DEMO_ACCOUNTS } from "@shared/infrastructure/emulators";

export function DemoLogin() {
  if (import.meta.env.VITE_USE_EMULATORS !== "true") return null;

  const signIn = (role: keyof typeof DEMO_ACCOUNTS) => {
    const { email, password } = DEMO_ACCOUNTS[role];
    void window.__e2eSignIn?.(email, password);
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
      <button className="ghost" onClick={() => signIn("admin")}>
        Demo: Admin
      </button>
      <button className="ghost" onClick={() => signIn("viewer")}>
        Demo: Viewer
      </button>
    </div>
  );
}
