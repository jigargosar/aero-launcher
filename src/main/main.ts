import {app, BrowserWindow, ipcMain, Menu, nativeImage, Tray} from 'electron'
import {Store} from './store'
import {join} from 'path'
import {readFileSync, writeFileSync} from 'fs'
import {spawn} from 'child_process'
import {HotkeyHandler} from './hotkey-handler'
import {channels} from '@shared/types'

// Use separate userData for dev to avoid conflicts with prod
if (!app.isPackaged) {
    app.setPath('userData', app.getPath('userData') + '-dev')
}

// Handle Squirrel events (install/uninstall/update)
if (process.platform === 'win32') {
    const squirrelEvent = process.argv[1]
    if (squirrelEvent) {
        const appFolder = join(process.execPath, '..')
        const rootFolder = join(appFolder, '..')
        const updateExe = join(rootFolder, 'Update.exe')
        const exeName = 'Aero Launcher.exe'

        const spawnUpdate = (args: string[]) => {
            spawn(updateExe, args, {detached: true}).unref()
        }

        switch (squirrelEvent) {
            case '--squirrel-install':
            case '--squirrel-updated':
                spawnUpdate(['--createShortcut', exeName])
                app.quit()
                break
            case '--squirrel-uninstall':
                spawnUpdate(['--removeShortcut', exeName])
                app.quit()
                break
            case '--squirrel-obsolete':
                app.quit()
                break
        }
    }
}

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
    tray.setToolTip(app.isPackaged ? 'Aero Launcher' : 'Aero Launcher (Dev)')
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
        Store.init(mainWindow)

        // Unified hotkey handler (replaces globalShortcut)
        HotkeyHandler.start(mainWindow, {
            onToggleLauncher: () => {
                const wasVisible = mainWindow.isVisible()
                if (wasVisible) {
                    mainWindow.hide()
                    return false
                } else {
                    mainWindow.setAlwaysOnTop(true)
                    mainWindow.show()
                    mainWindow.focus()
                    // Reset alwaysOnTop after a brief delay
                    setTimeout(() => mainWindow.setAlwaysOnTop(false), 100)
                    return true
                }
            },
            onHideLauncher: () => {
                mainWindow.hide()
            },
            onStateChange: (state) => {
                mainWindow.webContents.send(channels.launcherState, state)
            },
            onActivateWindow: () => {
                // Window focus handled in hotkey-handler
            },
        }).catch(err => console.error('[Main] HotkeyHandler failed to start:', err))

        ipcMain.on(channels.hideWindow, () => {
            mainWindow.blur()
            mainWindow.hide()
        })
    })

    app.on('window-all-closed', () => {
    })

    app.on('will-quit', () => {
        HotkeyHandler.stop()
    })
}
