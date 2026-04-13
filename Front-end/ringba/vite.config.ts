import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/ringbaclone/',   // 👈 add this
  plugins: [react()],
})