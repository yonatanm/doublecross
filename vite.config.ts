import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execSync } from 'child_process'

const gitSha = execSync('git rev-parse --short HEAD').toString().trim()
const gitDate = execSync('git log -1 --format=%cI').toString().trim()

export default defineConfig({
  base: '/doublecross/',
  plugins: [react(), tailwindcss()],
  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
    __GIT_DATE__: JSON.stringify(gitDate),
  },
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
