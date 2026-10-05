
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@identity/application/AuthContext";
import { ErrorBoundary } from "@shared/ui/ErrorBoundary";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
