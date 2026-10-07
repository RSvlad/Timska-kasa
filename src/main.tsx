import "./index.css";
import { resolveBrowserLocale } from "@shared/i18n/locale";
import { defineMessages, translate } from "@shared/i18n/messages";

const rootEl = document.getElementById("root")!;

const bootstrapMessages = defineMessages({
  sr: {
    "config.missing":
      "Недостаје Firebase конфигурација (VITE_FIREBASE_* променљиве нису постављене приликом build-а).",
  },
  en: {
    "config.missing":
      "Firebase configuration is missing (VITE_FIREBASE_* variables were not set at build time).",
  },
});

class MissingConfigError extends Error {}

function bootstrapErrorMessage(err: unknown): string {
  if (err instanceof MissingConfigError) {
    return translate(bootstrapMessages, resolveBrowserLocale(), "config.missing");
  }
  return err instanceof Error ? err.message : String(err);
}

async function bootstrap() {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    throw new MissingConfigError();
  }
  const [
    { StrictMode },
    { createRoot },
    { I18nProvider },
    { AuthProvider },
    { ErrorBoundary },
    { default: App },
  ] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("@shared/i18n/I18nProvider"),
    import("@identity/application/AuthContext"),
    import("@shared/ui/ErrorBoundary"),
    import("./App"),
  ]);
  createRoot(rootEl).render(
    <StrictMode>
      <I18nProvider>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </I18nProvider>
    </StrictMode>,
  );
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  rootEl.textContent = bootstrapErrorMessage(err);
  rootEl.style.cssText = "padding:2rem;font-family:sans-serif;color:#c0392b";
});
