import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { channels, ListItem } from '@shared/types'

type WindowBounds = { x: number; y: number; width: number; height: number }

const boundsFile = join(app.getPath('userData'), 'window-bounds.json')

function loadBounds(): WindowBounds | null {
  try {
    return JSON.parse(readFileSync(boundsFile, 'utf-8'))
  } catch {
    return null
  }
}

function saveBounds(bounds: WindowBounds): void {
  writeFileSync(boundsFile, JSON.stringify(bounds))
}

const mockItems: ListItem[] = [
  {
    key: 'ws:google',
    name: 'Google Search',
    icon: '',
    provider: 'websearch',
    typeLabel: 'Command',
    subtypeLabel: 'Web Search',
    meta: { url: 'https://google.com/search?q=' },
    actions: ['primary', 'input', 'nav']
  },
  {
    key: 'ws:youtube',
    name: 'YouTube Search',
    icon: '',
    provider: 'websearch',
    typeLabel: 'Command',
    subtypeLabel: 'Web Search',
    meta: { url: 'https://youtube.com/results?search_query=' },
    actions: ['primary', 'input', 'nav']
  },
  {
    key: 'ws:ddg',
    name: 'DuckDuckGo Search',
    icon: '',
    provider: 'websearch',
    typeLabel: 'Command',
    subtypeLabel: 'Web Search',
    meta: { url: 'https://duckduckgo.com/?q=' },
    actions: ['primary', 'input', 'nav']
  }
]

app.whenReady().then(() => {
  const savedBounds = loadBounds()

  const mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 600,
    height: savedBounds?.height ?? 400,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 400,
    minHeight: 200,
    frame: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('resize', () => saveBounds(mainWindow.getBounds()))
  mainWindow.on('move', () => saveBounds(mainWindow.getBounds()))

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  ipcMain.on(channels.requestListState, () => {
    mainWindow.webContents.send(channels.listState, mockItems)
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
