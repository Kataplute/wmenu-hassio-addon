import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relative ("./") : les assets se résolvent quel que soit le sous-chemin
// (racine ou /wmenu/ sur GitHub Pages). L'app n'a pas de routing par URL, donc sûr.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
