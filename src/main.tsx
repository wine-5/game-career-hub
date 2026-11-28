import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import { TrackerProvider } from "./lib/tracker.tsx";
import { GamesProvider } from "./lib/games.tsx";
import "./themes.css";
import "./styles.css";
import "./parts.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <TrackerProvider>
        <GamesProvider>
          <App />
        </GamesProvider>
      </TrackerProvider>
    </AuthProvider>
  </StrictMode>,
);
