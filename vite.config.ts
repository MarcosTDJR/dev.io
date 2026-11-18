import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

const port = Number(process.env.PORT || 8443)
const codespacesHost =
  process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
    allowedHosts: codespacesHost ? [codespacesHost] : undefined,
    proxy: {
      "/api": `http://localhost:${process.env.API_PORT || 8787}`,
    },
  },
  preview: {
    host: "0.0.0.0",
    port,
  },
})
