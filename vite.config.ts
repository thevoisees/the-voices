import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' works for GitHub Pages project sites and local preview
export default defineConfig({
  plugins: [react()],
  base: './',
  preview: {
    // Allow Cloudflare quick tunnels / phone testing
    allowedHosts: true,
  },
  server: {
    allowedHosts: true,
  },
})
