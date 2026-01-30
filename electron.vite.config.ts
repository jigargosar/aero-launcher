import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

const sharedPlugins = [tsconfigPaths(), checker({ typescript: true })]

const copyAssets = () => ({
  name: 'copy-assets',
  closeBundle() {
    copyFileSync(
      resolve(__dirname, 'src/main/ShellIcon.dll'),
      resolve(__dirname, 'out/main/ShellIcon.dll')
    )
    copyFileSync(
      resolve(__dirname, 'src/main/providers/fetch-shell-apps.ps1'),
      resolve(__dirname, 'out/main/fetch-shell-apps.ps1')
    )
    copyFileSync(
      resolve(__dirname, 'src/main/providers/fetch-app-details.ps1'),
      resolve(__dirname, 'out/main/fetch-app-details.ps1')
    )
  }
})

export default defineConfig({
  main: {
    plugins: [...sharedPlugins, copyAssets()],
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
