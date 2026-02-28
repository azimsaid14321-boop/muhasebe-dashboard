import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Production build'de tüm console.* ve debugger ifadelerini otomatik sil
    minify: 'esbuild',
    target: 'esnext',
  },
  esbuild: {
    // Yalnızca production'da etkili olur (dev modunda dokunmaz)
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})

