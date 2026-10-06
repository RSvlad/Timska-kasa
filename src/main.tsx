import "./index.css";

const rootEl = document.getElementById("root")!;

async function bootstrap() {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error(
      "Недостаје Firebase конфигурација (VITE_FIREBASE_* променљиве нису постављене приликом build-а).",
    );
  }
  const [{ StrictMode }, { createRoot }, { AuthProvider }, { ErrorBoundary }, { default: App }] =
    await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("@identity/application/AuthContext"),
      import("@shared/ui/ErrorBoundary"),
      import("./App"),
    ]);
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  rootEl.textContent = err instanceof Error ? err.message : String(err);
  rootEl.style.cssText = "padding:2rem;font-family:sans-serif;color:#c0392b";
});
