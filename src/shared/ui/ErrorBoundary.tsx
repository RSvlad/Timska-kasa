// UI: Хвата грешке рендеровања, да једна лоша ставка не обори целу апликацију.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useT } from "@shared/i18n/I18nProvider";
import { sharedMessages } from "./messages";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useT(sharedMessages);
  return (
    <div className="empty-state" role="alert">
      <span className="empty-icon">⚠️</span>
      <p>{t("error.render")}</p>
      <button className="primary" onClick={onRetry}>
        {t("error.retry")}
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Грешка у приказу:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback onRetry={() => this.setState({ error: null })} />;
  }
}
