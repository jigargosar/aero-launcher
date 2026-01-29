import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { join, extname } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { app, shell } from 'electron'
import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

const execAsync = promisify(exec)

const SHELL_ICON_DLL = app.isPackaged
    ? join(process.resourcesPath, 'ShellIcon.dll')
    : join(__dirname, 'ShellIcon.dll')
const CACHE_DIR = join(app.getPath('userData'), 'cache')
const CACHE_FILE = join(CACHE_DIR, 'apps.json')

// === Types ===

type ShellItem = { Name: string; Path: string }
type DesktopItem = { Name: string; Path: string; Target: string | null }

// === PowerShell ===

async function runPs(script: string): Promise<string> {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const { stdout } = await execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`, {
        maxBuffer: 1024 * 1024
    })
    return stdout.trim()
}

// === Fetching ===

async function fetchAppsFolder(): Promise<Item[]> {
    const script = `(New-Object -ComObject Shell.Application).Namespace("shell:AppsFolder").Items() | Select-Object Name, Path | ConvertTo-Json`
    const stdout = await runPs(script)
    const items = JSON.parse(stdout) as ShellItem[]

    return items.map(i => ({
        id: `app:${i.Path}`,
        name: i.Name,
        icon: Icons.app,
        moduleId: 'app',
        metadata: { appId: i.Path },
        triggers: ['execute', 'actionMenu', 'info'] as const,
    }))
}

async function fetchDesktop(): Promise<DesktopItem[]> {
    const script = `(New-Object -ComObject Shell.Application).Namespace([Environment]::GetFolderPath('Desktop')).Items() | Where-Object { $_.Path -match '\\.(lnk|url|exe)$' } | Select-Object Name, Path, @{N='Target';E={$_.GetLink.Path}} | ConvertTo-Json`
    const stdout = await runPs(script)
    const items = JSON.parse(stdout)
    // Handle single item (PS returns object not array)
    return Array.isArray(items) ? items : [items]
}

function getDesktopItemId(item: DesktopItem): string {
    const ext = extname(item.Path).toLowerCase()

    // For .lnk files, try to get appUserModelId from Electron
    if (ext === '.lnk') {
        try {
            const shortcut = shell.readShortcutLink(item.Path)
            if (shortcut.appUserModelId) {
                return shortcut.appUserModelId
            }
        } catch {
            // Fallback to target
        }
    }

    // For .url and others, use Target or Path
    return item.Target || item.Path
}

async function fetchAllItems(): Promise<Item[]> {
    const [apps, desktop] = await Promise.all([fetchAppsFolder(), fetchDesktop()])

    // Build set of app IDs for deduplication
    const appIds = new Set(apps.map(a => a.metadata.appId as string))

    // Process desktop items
    const uniqueDesktop: Item[] = []
    let dupeCount = 0

    for (const d of desktop) {
        const itemId = getDesktopItemId(d)

        if (appIds.has(itemId)) {
            dupeCount++
        } else {
            uniqueDesktop.push({
                id: `desktop:${d.Path}`,
                name: d.Name.replace(/ - Shortcut$/, ''),
                icon: Icons.app,
                moduleId: 'app',
                metadata: { appId: itemId, isDesktop: true },
                triggers: ['execute', 'actionMenu', 'info'],
            })
        }
    }

    console.log(`[app] Found: ${apps.length} apps, ${uniqueDesktop.length} desktop items`)

    return [...apps, ...uniqueDesktop]
}

// === Icons ===

async function loadIcons(items: Item[]): Promise<Item[]> {
    if (items.length === 0) return []

    const iconPaths = items.map(i => {
        const appId = i.metadata.appId as string
        const isDesktop = i.metadata.isDesktop as boolean | undefined
        return isDesktop ? appId : `shell:AppsFolder\\${appId}`
    })
    const pathsDelimited = iconPaths.join('|')

    const icons = await new Promise<Map<string, string>>((resolve) => {
        const results = new Map<string, string>()
        const ps = spawn('powershell', [
            '-NoProfile',
            '-Command',
            `Add-Type -Path '${SHELL_ICON_DLL}'; $paths = $input | Out-String; [ShellIcon]::GetIconsBase64($paths.Trim(), 48)`
        ])

        let stdout = ''
        ps.stdout.on('data', (data) => { stdout += data })
        ps.stdin.write(pathsDelimited)
        ps.stdin.end()

        ps.on('close', () => {
            try {
                const parsed = JSON.parse(stdout.trim()) as { path: string; icon: string | null }[]
                for (let i = 0; i < parsed.length; i++) {
                    const icon = parsed[i].icon
                    if (icon) {
                        results.set(items[i].id, `data:image/png;base64,${icon}`)
                    }
                }
                console.log(`[app] Icons loaded: ${results.size}/${items.length}`)
            } catch (err) {
                console.log('[app] Icon parse error:', err)
            }
            resolve(results)
        })
    })

    return items.map(item => ({
        ...item,
        icon: icons.get(item.id) ?? item.icon
    }))
}

// === Cache ===

async function readCache(): Promise<Item[]> {
    try {
        const data = await readFile(CACHE_FILE, 'utf-8')
        return JSON.parse(data)
    } catch {
        return []
    }
}

async function writeCache(items: Item[]): Promise<void> {
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(CACHE_FILE, JSON.stringify(items))
}

// === Provider ===

export const appProvider: Provider = {
    id: 'app',

    getRootItems: async () => {
        const cached = await readCache()
        if (cached.length > 0) {
            // Refresh in background
            fetchAllItems()
                .then(loadIcons)
                .then(writeCache)
                .catch(err => console.error('[app] Refresh error:', err))
            return cached
        }

        console.log('[app] Indexing...')
        const items = await fetchAllItems()
        const withIcons = await loadIcons(items)
        await writeCache(withIcons)
        console.log('[app] Indexing complete')
        return withIcons
    },

    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string | undefined
        const appId = item.metadata.appId as string
        const isDesktop = item.metadata.isDesktop as boolean | undefined

        // Action menu item
        if (kind === 'action') {
            if (trigger.type === 'execute') {
                const action = item.metadata.action as string
                if (action === 'open') {
                    if (isDesktop) {
                        exec(`start "" "${appId}"`)
                    } else {
                        exec(`start "" "shell:AppsFolder\\${appId}"`)
                    }
                } else if (action === 'admin') {
                    console.log(`[app] Run as admin: ${appId}`)
                } else if (action === 'reveal') {
                    console.log(`[app] Reveal: ${appId}`)
                }
                return { type: 'resetAndHide' }
            }
            return { type: 'noop' }
        }

        // Regular app item
        if (trigger.type === 'execute') {
            if (isDesktop) {
                exec(`start "" "${appId}"`)
            } else {
                exec(`start "" "shell:AppsFolder\\${appId}"`)
            }
            return { type: 'resetAndHide' }
        }

        if (trigger.type === 'actionMenu') {
            return {
                type: 'pushList',
                items: [
                    { id: `${item.id}-open`, name: 'Open', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'open', appId, isDesktop }, triggers: ['execute'] },
                    { id: `${item.id}-admin`, name: 'Run as Administrator', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'admin', appId, isDesktop }, triggers: ['execute'] },
                    { id: `${item.id}-location`, name: 'Open File Location', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'reveal', appId, isDesktop }, triggers: ['execute'] },
                ],
            }
        }

        if (trigger.type === 'info') {
            return {
                type: 'pushList',
                items: [
                    { id: `${item.id}-info-path`, name: 'Path: C:\\mock\\path\\app.exe', icon: Icons.action, moduleId: 'app', metadata: { kind: 'info' }, triggers: ['execute'] },
                    { id: `${item.id}-info-version`, name: 'Version: 1.0.0', icon: Icons.action, moduleId: 'app', metadata: { kind: 'info' }, triggers: ['execute'] },
                    { id: `${item.id}-info-appid`, name: `AppID: ${appId}`, icon: Icons.action, moduleId: 'app', metadata: { kind: 'info' }, triggers: ['execute'] },
                ],
            }
        }

        return { type: 'noop' }
    },
}
