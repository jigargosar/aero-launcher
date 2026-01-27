import {GlobalKeyboardListener, IGlobalKeyEvent, IGlobalKeyDownMap} from 'node-global-key-listener'
import {exec} from 'child_process'
import {promisify} from 'util'
import {app, BrowserWindow} from 'electron'
import {channels, LauncherMode, LauncherState, ListItem} from '@shared/types'
import {Icons} from '@shared/icons'

const execAsync = promisify(exec)

type InternalMode = 'idle' | 'launcher' | 'switcher'

type OpenWindow = {
    pid: number
    title: string
    hwnd: string
}

type HotkeyCallbacks = {
    onToggleLauncher: () => boolean  // returns true if now visible
    onHideLauncher: () => void
    onStateChange: (state: LauncherState) => void
    onActivateWindow: (item: ListItem) => void
}

const SHORTCUT_KEY = app.isPackaged ? 'FORWARD SLASH' : 'SECTION'

let listener: GlobalKeyboardListener | null = null
let mainWindow: BrowserWindow | null = null
let mode: InternalMode = 'idle'
let windows: OpenWindow[] = []
let selectedIndex = 0
let isFetching = false
let fetchId = 0  // To invalidate stale fetches
let winReleasedWhileFetching = false

function sendState(): void {
    if (!mainWindow) return
    const launcherMode: LauncherMode = mode === 'switcher' ? 'switcher' : 'launcher'
    const state: LauncherState = {
        mode: launcherMode,
        items: windowsToListItems(windows),
        selectedIndex,
    }
    mainWindow.webContents.send(channels.launcherState, state)
}

function resetState(): void {
    mode = 'idle'
    windows = []
    selectedIndex = 0
    fetchId++  // Invalidate any pending fetches
    isFetching = false
    winReleasedWhileFetching = false
    // Send null to clear switcher state in renderer
    if (mainWindow) {
        mainWindow.webContents.send(channels.launcherState, null)
    }
}

async function fetchOpenWindows(): Promise<OpenWindow[]> {
    const script = `
        Get-Process | Where-Object {$_.MainWindowTitle -ne ""} |
        Select-Object Id, MainWindowTitle, @{Name='Handle';Expression={$_.MainWindowHandle}} |
        ConvertTo-Json
    `
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const {stdout} = await execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`, {
        maxBuffer: 1024 * 1024
    })

    const parsed = JSON.parse(stdout.trim())
    const items = Array.isArray(parsed) ? parsed : [parsed]

    return items.map((w: {Id: number; MainWindowTitle: string; Handle: string}) => ({
        pid: w.Id,
        title: w.MainWindowTitle,
        hwnd: w.Handle,
    }))
}

async function focusWindow(hwnd: string): Promise<void> {
    const script = `
        Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }
"@
        $hwnd = [IntPtr]::new(${hwnd})
        [Win32]::ShowWindow($hwnd, 9)  # SW_RESTORE
        [Win32]::SetForegroundWindow($hwnd)
    `
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    await execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`)
}

function windowsToListItems(windows: OpenWindow[]): ListItem[] {
    return windows.map(w => ({
        sourceId: 'windows',
        id: `window:${w.hwnd}`,
        name: w.title,
        icon: Icons.default,
        metadata: {hwnd: w.hwnd, pid: String(w.pid)},
    }))
}

export const HotkeyHandler = {
    async start(window: BrowserWindow, callbacks: HotkeyCallbacks): Promise<void> {
        mainWindow = window
        listener = new GlobalKeyboardListener()

        const handleKeyEvent = (e: IGlobalKeyEvent, down: IGlobalKeyDownMap) => {
            const keyName = e.name
            const isWinKey = keyName === 'LEFT META' || keyName === 'RIGHT META'
            const isShortcutKey = keyName === SHORTCUT_KEY
            const isWinHeld = down['LEFT META'] || down['RIGHT META']

            // Win key released while in switcher mode - activate selected window
            if (e.state === 'UP' && isWinKey && mode === 'switcher') {
                console.log(`[HotkeyHandler] Win released in switcher mode, windows:`, windows.length, 'fetching:', isFetching)

                // Only switch if we have windows (fetch completed)
                if (windows.length > 0 && windows[selectedIndex]) {
                    const item = windowsToListItems(windows)[selectedIndex]
                    callbacks.onActivateWindow(item)
                    focusWindow(windows[selectedIndex].hwnd).catch(console.error)
                    resetState()
                    callbacks.onHideLauncher()
                } else if (isFetching) {
                    // Still fetching - mark that Win was released
                    winReleasedWhileFetching = true
                } else {
                    // No windows and not fetching - just hide
                    resetState()
                    callbacks.onHideLauncher()
                }
            }

            // Win key released in launcher mode - just reset internal mode, keep window open
            if (e.state === 'UP' && isWinKey && mode === 'launcher') {
                mode = 'idle'
            }

            // Shortcut key (backtick) while Win held - always capture to prevent propagation
            if (isShortcutKey && isWinHeld) {
                // Only act on key down
                if (e.state === 'DOWN') {
                    console.log(`[HotkeyHandler] Win+\` pressed, current mode: ${mode}`)

                    switch (mode) {
                        case 'idle':
                            // First press - toggle launcher
                            const isNowVisible = callbacks.onToggleLauncher()
                            if (isNowVisible) {
                                mode = 'launcher'
                                // Ensure renderer is in launcher mode
                                if (mainWindow) {
                                    mainWindow.webContents.send(channels.launcherState, null)
                                }
                            } else {
                                // Window was hidden, reset state
                                resetState()
                            }
                            break

                        case 'launcher':
                            // Second press - switch to windows mode
                            if (!isFetching) {
                                isFetching = true
                                mode = 'switcher'
                                winReleasedWhileFetching = false
                                const currentFetchId = ++fetchId
                                fetchOpenWindows()
                                    .then(fetched => {
                                        // Only use result if this fetch is still valid
                                        if (currentFetchId === fetchId && mode === 'switcher') {
                                            windows = fetched
                                            selectedIndex = 0
                                            console.log('[HotkeyHandler] Fetched windows:', windows.length)

                                            // If Win was released while fetching, auto-switch to first window
                                            if (winReleasedWhileFetching && windows.length > 0) {
                                                const item = windowsToListItems(windows)[0]
                                                callbacks.onActivateWindow(item)
                                                focusWindow(windows[0].hwnd).catch(console.error)
                                                resetState()
                                                callbacks.onHideLauncher()
                                            } else {
                                                sendState()
                                            }
                                        }
                                    })
                                    .catch(console.error)
                                    .finally(() => {
                                        if (currentFetchId === fetchId) {
                                            isFetching = false
                                        }
                                    })
                            }
                            break

                        case 'switcher':
                            // Subsequent presses - cycle through windows
                            if (windows.length > 0) {
                                selectedIndex = (selectedIndex + 1) % windows.length
                                sendState()
                            }
                            break
                    }
                }

                // Always prevent key from propagating (both DOWN and UP)
                return true
            }
        }

        await listener.addListener(handleKeyEvent)
        console.log(`[HotkeyHandler] Started, shortcut key: ${SHORTCUT_KEY}`)
    },

    stop(): void {
        if (listener) {
            listener.kill()
            listener = null
        }
        mode = 'idle'
        windows = []
        selectedIndex = 0
        console.log('[HotkeyHandler] Stopped')
    },

    getSelectedIndex(): number {
        return selectedIndex
    }
}
