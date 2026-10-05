// UI: Хвата грешке рендеровања, да једна лоша ставка не обори целу апликацију.

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
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
    return (
      <div className="empty-state" role="alert">
        <span className="empty-icon">⚠️</span>
        <p>Дошло је до грешке при приказу. Освежи страницу или покушај поново.</p>
        <button className="primary" onClick={() => this.setState({ error: null })}>
          Покушај поново
        </button>
      </div>
    );
  }
}
