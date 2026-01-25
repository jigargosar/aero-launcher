import { defineConfig } from 'electron-vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'

const alias = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@assets': resolve(__dirname, 'assets')
}

export default defineConfig({
  main: {
    resolve: { alias },
    plugins: [checker({ typescript: true })],
    build: {
      rollupOptions: {
        input: 'src/main/main.ts',
        output: { entryFileNames: 'index.js' }
      }
    }
  },
  preload: {
    resolve: { alias },
    build: {
      rollupOptions: {
        input: 'src/preload/preload.ts',
        output: { entryFileNames: 'preload.js' }
      }
    }
  },
  renderer: {
    resolve: { alias },
    plugins: [tailwindcss(), react(), checker({ typescript: true })]
  }
})
