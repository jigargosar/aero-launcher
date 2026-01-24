import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } from 'electron'
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

const ICON_PATH = join(__dirname, '../../assets/icon.png')

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
    skipTaskbar: true,
    show: false,
    icon: ICON_PATH,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('resize', () => saveBounds(mainWindow.getBounds()))
  mainWindow.on('move', () => saveBounds(mainWindow.getBounds()))

  // Hide instead of close
  mainWindow.on('close', e => {
    e.preventDefault()
    mainWindow.hide()
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // System tray
  const trayIcon = nativeImage.createFromPath(ICON_PATH)
  const tray = new Tray(trayIcon)
  tray.setToolTip('Launch Bar')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { label: 'Quit', click: () => { mainWindow.destroy(); app.quit() } }
  ]))
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
    }
  })

  // Global hotkey: Win+` to toggle
  const registered = globalShortcut.register('Super+`', () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  if (!registered) {
    console.error('Failed to register global shortcut: Super+`')
  } else {
    console.log('Global shortcut registered: Super+`')
  }

  // Show window initially
  mainWindow.show()

  ipcMain.on(channels.requestListState, () => {
    mainWindow.webContents.send(channels.listState, mockItems)
  })
})

app.on('window-all-closed', () => {
  // Don't quit on window close
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
