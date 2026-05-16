import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    noDiscovery: true,
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "socket.io-client",
      "lucide-react",
      "jspdf",
      "jspdf-autotable",
    ],
  },
  server: {
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
