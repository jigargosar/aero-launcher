import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { app } from 'electron'
import { XMLParser } from 'fast-xml-parser'
import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

const execAsync = promisify(exec)

// === Settings Deep Links ===

const SETTINGS_DEEP_LINKS: Item[] = [
    {
        id: 'settings:display',
        name: 'Display Settings',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:display' },
        triggers: ['execute'],
    },
    {
        id: 'settings:bluetooth',
        name: 'Bluetooth Settings',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:bluetooth' },
        triggers: ['execute'],
    },
    {
        id: 'settings:wifi',
        name: 'WiFi Settings',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:network-wifi' },
        triggers: ['execute'],
    },
    {
        id: 'settings:personalization',
        name: 'Personalization',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:personalization' },
        triggers: ['execute'],
    },
    {
        id: 'settings:colors',
        name: 'Colors & Accent',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:colors' },
        triggers: ['execute'],
    },
    {
        id: 'settings:notifications',
        name: 'Notifications',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:notifications' },
        triggers: ['execute'],
    },
    {
        id: 'settings:defaultapps',
        name: 'Default Apps',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:defaultapps' },
        triggers: ['execute'],
    },
    {
        id: 'settings:powersleep',
        name: 'Power & Sleep',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:powersleep' },
        triggers: ['execute'],
    },
    {
        id: 'settings:storage',
        name: 'Storage Settings',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:storagesense' },
        triggers: ['execute'],
    },
    {
        id: 'settings:sound',
        name: 'Sound Settings',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:sound' },
        triggers: ['execute'],
    },
    {
        id: 'settings:privacy',
        name: 'Privacy & Security',
        icon: Icons.settings,
        moduleId: 'app',
        metadata: { category: 'settings', cmd: 'start ms-settings:privacy' },
        triggers: ['execute'],
    },
]

const SHELL_ICON_DLL = app.isPackaged
    ? join(process.resourcesPath, 'ShellIcon.dll')
    : join(__dirname, 'ShellIcon.dll')
const FETCH_APPS_SCRIPT = app.isPackaged
    ? join(process.resourcesPath, 'fetch-shell-apps.ps1')
    : join(__dirname, 'fetch-shell-apps.ps1')
const FETCH_DETAILS_SCRIPT = app.isPackaged
    ? join(process.resourcesPath, 'fetch-app-details.ps1')
    : join(__dirname, 'fetch-app-details.ps1')
const CACHE_DIR = join(app.getPath('userData'), 'cache')
const CACHE_FILE = join(CACHE_DIR, 'apps.json')

// === Types ===

type AppInfo = Record<string, string>
type ShellItemRaw = { Name: string; Path: string; Category: string }

// === File Details Whitelist ===

const FILE_DETAILS_WHITELIST = [
    'Name',
    'Size',
    'Type',
    'File extension',
    'Filename',
    'Date modified',
    'Date created',
    'Date accessed',
    'Attributes',
    'Owner',
    'Kind',
    'Company',
    'File description',
    'Product name',
    'Product version',
    'File version',
    'Language',
    'File location',
    'Path',
    'Computer',
]

// === Manifest Parsing ===

const MANIFEST_BLACKLIST = [
    'xmlns',
    'build:Metadata',
    'InProcessServer',
    'ActivatableClass',
    'ThreadingModel',
    'mp:PhoneIdentity',
]

function flattenObject(
    obj: unknown,
    prefix = '',
    result: Record<string, string> = {},
): Record<string, string> {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
            flattenObject(value, prefix ? `${prefix}.${key}` : key, result)
        }
    } else if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
            flattenObject(item, `${prefix}[${idx}]`, result)
        })
    } else if (obj !== null && obj !== undefined && obj !== '') {
        result[prefix] = String(obj)
    }
    return result
}

function applyBlacklist(props: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(props).filter(([key]) => !MANIFEST_BLACKLIST.some((bl) => key.includes(bl))),
    )
}

async function parseManifest(manifestPath: string): Promise<AppInfo> {
    try {
        const xml = await readFile(manifestPath, 'utf-8')
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
        const parsed = parser.parse(xml)
        const flat = flattenObject(parsed)
        return applyBlacklist(flat)
    } catch {
        return {}
    }
}

// === Fetching ===

async function fetchAppsFolder(): Promise<Item[]> {
    const { stdout } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${FETCH_APPS_SCRIPT}"`,
        {
            maxBuffer: 10 * 1024 * 1024,
        },
    )

    const items = JSON.parse(stdout.trim()) as ShellItemRaw[]

    return items.map((i) => {
        const isSettingsApp = i.Name === 'Settings'
        return {
            id: `app:${i.Path}`,
            name: i.Name,
            icon: Icons.app,
            moduleId: 'app',
            metadata: {
                appId: i.Path,
                category: i.Category,
            },
            triggers: isSettingsApp
                ? ['execute', 'browse', 'actionMenu']
                : ['execute', 'actionMenu'], // TODO: add 'info' back when manifest blacklist is finalized
        }
    })
}

async function fetchAppDetails(appPath: string, category: string): Promise<AppInfo> {
    const whitelistArg = FILE_DETAILS_WHITELIST.join('|')
    const { stdout } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${FETCH_DETAILS_SCRIPT}" -AppPath "${appPath}" -Category "${category}" -Whitelist "${whitelistArg}"`,
        { maxBuffer: 10 * 1024 * 1024 },
    )

    let info: AppInfo = {}
    try {
        info = JSON.parse(stdout.trim()) || {}
    } catch {
        return {}
    }

    // For UWP, parse manifest in Node.js
    if (category === 'UWP' && info.ManifestPath) {
        const manifestInfo = await parseManifest(info.ManifestPath)
        delete info.ManifestPath
        info = { ...info, ...manifestInfo }
    }

    return info
}

// === Icons ===

async function loadIcons(items: Item[]): Promise<Item[]> {
    if (items.length === 0) return []

    const iconPaths = items.map((i) => `shell:AppsFolder\\${i.metadata.appId as string}`)
    const pathsDelimited = iconPaths.join('|')

    const icons = await new Promise<Map<string, string>>((resolve) => {
        const results = new Map<string, string>()
        const ps = spawn('powershell', [
            '-NoProfile',
            '-Command',
            `Add-Type -Path '${SHELL_ICON_DLL}'; $paths = $input | Out-String; [ShellIcon]::GetIconsBase64($paths.Trim(), 48)`,
        ])

        let stdout = ''
        ps.stdout.on('data', (data) => {
            stdout += data
        })
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

    return items.map((item) => ({
        ...item,
        icon: icons.get(item.id) ?? item.icon,
    }))
}

// === Cache ===

async function writeCache(items: Item[]): Promise<void> {
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(CACHE_FILE, JSON.stringify(items))
}

// === Provider ===

export const AppProvider: Provider = {
    id: 'app',

    getRootItems: async () => {
        console.log('[app] Indexing...')
        const items = await fetchAppsFolder()
        const withIcons = await loadIcons(items)
        await writeCache(withIcons)
        console.log('[app] Indexing complete')
        return withIcons
    },

    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string | undefined
        const appId = item.metadata.appId as string
        const category = item.metadata.category as string
        const cmd = item.metadata.cmd as string | undefined

        const execApp = () => {
            exec(`start "" "shell:AppsFolder\\${appId}"`)
        }

        // Settings deep links
        if (category === 'settings' && trigger.type === 'execute' && cmd) {
            exec(cmd)
            return { type: 'resetAndHide' }
        }

        if (kind === 'action') {
            if (trigger.type === 'execute') {
                const action = item.metadata.action as string
                if (action === 'open') {
                    execApp()
                } else if (action === 'admin') {
                    console.log(`[app] Run as admin: ${appId}`)
                } else if (action === 'reveal') {
                    console.log(`[app] Reveal: ${appId}`)
                }
                return { type: 'resetAndHide' }
            }
            return { type: 'noop' }
        }

        if (trigger.type === 'execute') {
            execApp()
            return { type: 'resetAndHide' }
        }

        // Settings app browse → show deep links
        if (trigger.type === 'browse' && item.name === 'Settings') {
            return { type: 'pushList', items: SETTINGS_DEEP_LINKS }
        }

        if (trigger.type === 'actionMenu') {
            return {
                type: 'pushList',
                items: [
                    {
                        id: `${item.id}-open`,
                        name: 'Open',
                        icon: Icons.action,
                        moduleId: 'app',
                        metadata: { kind: 'action', action: 'open', appId },
                        triggers: ['execute'],
                    },
                    {
                        id: `${item.id}-admin`,
                        name: 'Run as Administrator',
                        icon: Icons.action,
                        moduleId: 'app',
                        metadata: { kind: 'action', action: 'admin', appId },
                        triggers: ['execute'],
                    },
                    {
                        id: `${item.id}-location`,
                        name: 'Open File Location',
                        icon: Icons.action,
                        moduleId: 'app',
                        metadata: { kind: 'action', action: 'reveal', appId },
                        triggers: ['execute'],
                    },
                ],
            }
        }

        if (trigger.type === 'info') {
            // Fetch details fresh (no cache)
            const info = await fetchAppDetails(appId, category)

            if (Object.keys(info).length === 0) {
                return {
                    type: 'pushList',
                    items: [
                        {
                            id: `${item.id}-info-appid`,
                            name: `AppID: ${appId}`,
                            icon: Icons.action,
                            moduleId: 'app',
                            metadata: { kind: 'info' },
                            triggers: ['execute'],
                        },
                    ],
                }
            }

            const infoItems: Item[] = Object.entries(info).map(([key, value]) => ({
                id: `${item.id}-info-${key}`,
                name: `${key}: ${value}`,
                icon: Icons.action,
                moduleId: 'app',
                metadata: { kind: 'info', key, value },
                triggers: ['execute'],
            }))

            return { type: 'pushList', items: infoItems }
        }

        return { type: 'noop' }
    },
}
