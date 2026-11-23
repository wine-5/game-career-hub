import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import { TrackerProvider } from "./lib/tracker.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <TrackerProvider>
        <App />
      </TrackerProvider>
    </AuthProvider>
  </StrictMode>,
);
