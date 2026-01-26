import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

const sharedPlugins = [tsconfigPaths(), checker({ typescript: true })]

const copyDll = () => ({
  name: 'copy-dll',
  closeBundle() {
    copyFileSync(
      resolve(__dirname, 'src/main/ShellIcon.dll'),
      resolve(__dirname, 'out/main/ShellIcon.dll')
    )
  }
})

export default defineConfig({
  main: {
    plugins: [...sharedPlugins, copyDll()],
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
