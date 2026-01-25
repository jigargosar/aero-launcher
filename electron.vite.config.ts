import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'

const sharedPlugins = [tsconfigPaths(), checker({ typescript: true })]

export default defineConfig({
  main: {
    plugins: sharedPlugins,
    build: {
      rollupOptions: {
        input: 'src/main/main.ts',
        output: { entryFileNames: 'index.js' }
      }
    }
  },
  preload: {
    plugins: sharedPlugins,
    build: {
      rollupOptions: {
        input: 'src/preload/preload.ts',
        output: { entryFileNames: 'preload.js' }
      }
    }
  },
  renderer: {
    plugins: [...sharedPlugins, tailwindcss(), react()]
  }
})
