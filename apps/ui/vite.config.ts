import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

function deriveProxyTarget(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.protocol === "ws:" || url.protocol === "wss:") {
      url.protocol = url.protocol === "wss:" ? "https:" : "http:";
      return url.toString();
    }
    return url.toString();
  } catch {
    return `http://${raw.replace(/^\/*/, "")}`;
  }
}

const rawProxy =
  process.env.VITE_SIM_DIRECTOR_URL ?? process.env.SIM_DIRECTOR_PROXY ?? "ws://127.0.0.1:8080";
const proxyTarget = deriveProxyTarget(rawProxy);

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.UI_PORT ?? 5173),
    host: process.env.UI_HOST ?? "0.0.0.0",
    proxy: {
      "/simulator": {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/simulator/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    mockReset: true,
  },
});
