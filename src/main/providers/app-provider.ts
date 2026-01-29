import { exec } from 'child_process'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { app } from 'electron'
import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

const execAsync = promisify(exec)

const SHELL_ICON_DLL = app.isPackaged
    ? join(process.resourcesPath, 'ShellIcon.dll')
    : join(__dirname, 'ShellIcon.dll')
const CACHE_DIR = join(app.getPath('userData'), 'cache')
const CACHE_FILE = join(CACHE_DIR, 'apps.json')

type AppEntry = {
    Name: string
    AppID: string
}

async function runPs(script: string): Promise<string> {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const { stdout } = await execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`, {
        maxBuffer: 1024 * 1024
    })
    return stdout.trim()
}

async function fetchApps(): Promise<Item[]> {
    const stdout = await runPs('Get-StartApps | ConvertTo-Json')
    const rawApps = JSON.parse(stdout) as AppEntry[]

    return rawApps.map(a => ({
        id: `app:${a.AppID}`,
        name: a.Name,
        icon: Icons.app,
        moduleId: 'app',
        metadata: { appId: a.AppID },
        triggers: ['execute', 'actionMenu'] as const,
    }))
}

async function loadIcons(apps: Item[]): Promise<Item[]> {
    if (apps.length === 0) return []

    const shellPaths = apps.map(a => `shell:AppsFolder\\${a.metadata.appId}`)
    const pathsDelimited = shellPaths.join('|')

    const icons = await new Promise<Map<string, string>>((resolve) => {
        const results = new Map<string, string>()
        const ps = spawn('powershell', [
            '-NoProfile',
            '-Command',
            `Add-Type -Path '${SHELL_ICON_DLL}'; $paths = $input | Out-String; [ShellIcon]::GetIconsBase64($paths.Trim(), 48)`
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
                        results.set(apps[i].id, `data:image/png;base64,${icon}`)
                    }
                }
            } catch (err) {
                console.log('[app] Icon parse error:', err)
            }
            resolve(results)
        })
    })

    return apps.map(app => ({
        ...app,
        icon: icons.get(app.id) ?? app.icon
    }))
}

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

let cachedApps: Item[] = []

export const appProvider: Provider = {
    id: 'app',

    getRootItems: async () => {
        // Return cache immediately if available
        const cached = await readCache()
        if (cached.length > 0) {
            cachedApps = cached
            // Refresh in background
            fetchApps().then(loadIcons).then(apps => {
                cachedApps = apps
                writeCache(apps)
            }).catch(err => console.error('[app] Refresh error:', err))
            return cached
        }

        // No cache - fetch and wait
        console.log('[app] Indexing...')
        const apps = await fetchApps()
        console.log('[app] Found:', apps.length)
        const appsWithIcons = await loadIcons(apps)
        await writeCache(appsWithIcons)
        cachedApps = appsWithIcons
        console.log('[app] Indexing complete')
        return appsWithIcons
    },

    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string | undefined

        // Action menu item
        if (kind === 'action') {
            if (trigger.type === 'execute') {
                const action = item.metadata.action as string
                const appId = item.metadata.appId as string
                if (action === 'open') {
                    exec(`start "" "shell:AppsFolder\\${appId}"`)
                } else if (action === 'admin') {
                    // Run as admin requires different approach
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
            const appId = item.metadata.appId as string
            exec(`start "" "shell:AppsFolder\\${appId}"`)
            return { type: 'resetAndHide' }
        }

        if (trigger.type === 'actionMenu') {
            const appId = item.metadata.appId as string
            return {
                type: 'pushList',
                items: [
                    { id: `${item.id}-open`, name: 'Open', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'open', appId }, triggers: ['execute'] },
                    { id: `${item.id}-admin`, name: 'Run as Administrator', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'admin', appId }, triggers: ['execute'] },
                    { id: `${item.id}-location`, name: 'Open File Location', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'reveal', appId }, triggers: ['execute'] },
                ],
            }
        }

        return { type: 'noop' }
    },
}
