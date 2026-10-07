import { useState } from "react";
import { useAuth } from "@identity/application/AuthContext";
import { CategoryList } from "@finance/ui/CategoryList";
import { RecordList } from "@finance/ui/RecordList";
import { Dashboard } from "@finance/ui/Dashboard";
import { FundsPage } from "@finance/ui/FundsPage";
import { FinanceDataProvider } from "@finance/application/FinanceDataProvider";
import { useT } from "@shared/i18n/I18nProvider";
import { LanguageSwitcher } from "@shared/ui/LanguageSwitcher";
import { appMessages } from "./App.messages";

type View = "dashboard" | "records" | "funds" | "categories";

const NAV_ITEMS = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: "◈" },
  { id: "records", labelKey: "nav.records", icon: "≡" },
  { id: "funds", labelKey: "nav.funds", icon: "🗂" },
  { id: "categories", labelKey: "nav.categories", icon: "⊞" },
] as const satisfies readonly { id: View; labelKey: string; icon: string }[];

export default function App() {
  const { user, loading, deniedEmail, error, signIn, signOutUser } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const t = useT(appMessages);

  if (loading) {
    return (
      <div className="center-screen">
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{t("app.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="center-screen login-screen">
        <div className="login-logo">💰</div>
        <h1 className="login-title">{t("app.name")}</h1>
        {deniedEmail ? (
          <>
            <p className="login-sub" role="alert">
              {t("auth.denied", { email: deniedEmail })}
            </p>
            <button className="primary login-btn" onClick={signOutUser}>
              {t("auth.signOutButton")}
            </button>
          </>
        ) : (
          <>
            <p className="login-sub">{t("auth.prompt")}</p>
            {error && (
              <p className="login-sub" role="alert" style={{ color: "var(--danger, #c0392b)" }}>
                {t(`auth.error.${error}`)}
              </p>
            )}
            <button className="primary login-btn" onClick={signIn}>
              {t("auth.signIn")}
            </button>
          </>
        )}
        <LanguageSwitcher className="ghost lang-switch" />
      </div>
    );
  }

  const activeItem = NAV_ITEMS.find((item) => item.id === view) ?? NAV_ITEMS[0];

  return (
    <FinanceDataProvider>
      <div className="app-shell">
        {/* ── Top bar ── */}
        <header className="top-bar">
          <span className="top-bar-logo">💰</span>
          <span className="top-bar-title">{t(activeItem.labelKey)}</span>
          <div className="top-bar-right">
            <span className="role-badge">{user.role}</span>
            <LanguageSwitcher />
            <button
              className="ghost icon-btn"
              title={t("auth.signOut")}
              aria-label={t("auth.signOut")}
              onClick={signOutUser}
            >
              ⏏
            </button>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="app-main">
          {view === "dashboard" && <Dashboard />}
          {view === "records" && <RecordList role={user.role} currentUserId={user.id} />}
          {view === "funds" && <FundsPage role={user.role} />}
          {view === "categories" && <CategoryList role={user.role} />}
        </main>

        {/* ── Bottom nav ── */}
        <nav className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`bottom-nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>
      </div>
    </FinanceDataProvider>
  );
}
