// Plain SPA build of Bridge for the portfolio demo (see scripts/bridge-demo/build.sh): no TanStack Start, no Worker.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/protos/bridge/",
  plugins: [tsconfigPaths(), react(), tailwindcss()],
  build: { outDir: "dist-demo", emptyOutDir: true },
});
