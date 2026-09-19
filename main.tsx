import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthGate } from "./components/AuthGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthGate>
        {({ userName, userId, role, team, onLogout, onTeamChange }) => (
          <App userName={userName} userId={userId} role={role} team={team} onLogout={onLogout} onTeamChange={onTeamChange} />
        )}
      </AuthGate>
    </ErrorBoundary>
  </StrictMode>
);
