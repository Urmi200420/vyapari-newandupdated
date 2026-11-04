import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api calls are forwarded to the Spring Boot backend while developing
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ["terminal.local"],
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});