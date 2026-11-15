import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the built site works from any folder or host.
  // Routing uses the URL hash, so no server rewrites are needed.
  base: './',
  plugins: [react(), tailwindcss()],
})
