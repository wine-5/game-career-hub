import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages では https://wine-5.github.io/game-career-hub/ で公開されるため base を合わせる
export default defineConfig({
  base: "/game-career-hub/",
  plugins: [react()],
});
