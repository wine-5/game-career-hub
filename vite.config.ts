import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages では https://wine-5.github.io/game-career-hub/ で公開されるため base を合わせる
export default defineConfig({
  base: "/game-career-hub/",
  plugins: [react()],
  // F5（.vscode/launch.json）で開く URL と合わせるため、ポートを固定する
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
