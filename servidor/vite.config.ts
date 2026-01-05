import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/server.ts",
      formats: ["cjs"],
    },
    outDir: "dist",
    rollupOptions: {
      external: ["express", "bcryptjs", "better-sqlite3", "cors"], // Node tomará estos de node_modules
    },
  },
});
