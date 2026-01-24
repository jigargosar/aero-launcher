import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { channels, ListItem } from '@shared/types'

let mainWindow: BrowserWindow | null = null

const helloItem: ListItem = {
  key: 'hello',
  name: 'Hello World',
  icon: '',
  provider: 'demo',
  typeLabel: 'Demo',
  meta: {},
  actions: ['primary']
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.on(channels.requestListState, () => {
    mainWindow?.webContents.send(channels.listState, [helloItem])
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
