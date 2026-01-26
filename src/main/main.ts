import {app, BrowserWindow, globalShortcut, Menu, nativeImage, Tray} from 'electron'
import {Store} from './store'
import {join} from 'path'
import {readFileSync, writeFileSync} from 'fs'

type WindowBounds = { x?: number; y?: number; width: number; height: number }

const DEFAULT_BOUNDS: WindowBounds = {width: 600, height: 400}
const BOUNDS_FILE_PATH = join(app.getPath('userData'), 'window-bounds.json')
const ICON_PATH = join(__dirname, '../../assets/icon.png')
const TRAY_ICON_PATH = join(__dirname, '../../assets/icon.png')

// === Bounds Persistence ===

function loadBounds(): WindowBounds {
    try {
        return JSON.parse(readFileSync(BOUNDS_FILE_PATH, 'utf-8'))
    } catch {
        return DEFAULT_BOUNDS
    }
}

function saveBounds(bounds: WindowBounds): void {
    writeFileSync(BOUNDS_FILE_PATH, JSON.stringify(bounds))
}

// === Window ===

function createMainWindow(): BrowserWindow {
    const window = new BrowserWindow({
        ...loadBounds(),
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
            nodeIntegration: false,
        },
    })

    window.on('resize', () => saveBounds(window.getBounds()))
    window.on('move', () => saveBounds(window.getBounds()))

    window.on('close', (e) => {
        e.preventDefault()
        window.hide()
    })

    if (process.env.NODE_ENV === 'development') {
        window.loadURL('http://localhost:5173')
    } else {
        window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return window
}

// === Tray ===

function setupTray(window: BrowserWindow): Tray {
    const trayIcon = nativeImage.createFromPath(TRAY_ICON_PATH)
    const tray = new Tray(trayIcon)
    tray.setToolTip('Launch Bar')
    tray.setContextMenu(
        Menu.buildFromTemplate([
            {
                label: 'Show',
                click: () => window.show()
            },
            {
                label: 'Quit',
                click: () => {
                    window.destroy()
                    app.quit()
                },
            },
        ]),
    )
    tray.on('click', () => {
        if (window.isVisible()) {
            window.hide()
        } else {
            window.show()
        }
    })
    return tray
}

// === Hotkeys ===

function registerHotkeys(window: BrowserWindow): void {
    const shortcut = app.isPackaged ? 'Super+/' : 'Super+`'
    const registered = globalShortcut.register(shortcut, () => {
        if (window.isVisible() && window.isFocused()) {
            window.blur()
            window.hide()
        } else {
            window.show()
        }
    })

    if (!registered) {
        console.error(`Failed to register global shortcut: ${shortcut}`)
    } else {
        console.log(`Global shortcut registered: ${shortcut}`)
    }
}

// === App Lifecycle ===

if (!app.requestSingleInstanceLock()) {
    app.quit()
} else {
    app.whenReady().then(() => {
        const mainWindow = createMainWindow()

        app.on('second-instance', () => {
            mainWindow.show()
            mainWindow.focus()
        })

        setupTray(mainWindow)
        registerHotkeys(mainWindow)
        Store.init(mainWindow)
    })

    app.on('window-all-closed', () => {
    })

    app.on('will-quit', () => {
        globalShortcut.unregisterAll()
    })
}


