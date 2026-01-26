import {spawn} from 'child_process'
import {promisify} from 'util'
import {exec} from 'child_process'
import {join} from 'path'
import {readFile, writeFile, mkdir} from 'fs/promises'
import {app} from 'electron'
import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'
import {showItemDialog} from './utils'

const execAsync = promisify(exec)
const SHELL_ICON_DLL = join(__dirname, 'ShellIcon.dll')
const CACHE_DIR = join(app.getPath('userData'), 'cache')
const CACHE_FILE = join(CACHE_DIR, 'apps.json')

type AppEntry = {
    Name: string
    AppID: string
}

type RawApp = ListItem & {metadata: {appId: string}}

async function runPs(script: string): Promise<string> {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const {stdout} = await execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`, {
        maxBuffer: 1024 * 1024
    })
    return stdout.trim()
}

async function fetchApps(): Promise<RawApp[]> {
    const stdout = await runPs('Get-StartApps | ConvertTo-Json')
    const rawApps = JSON.parse(stdout) as AppEntry[]

    return rawApps.map(a => ({
        sourceId: 'apps',
        id: `app:${a.AppID}`,
        name: a.Name,
        icon: Icons.default,
        metadata: {appId: a.AppID},
    }))
}

async function loadIcons(apps: RawApp[]): Promise<RawApp[]> {
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
                const parsed = JSON.parse(stdout.trim()) as {path: string; icon: string | null}[]
                for (let i = 0; i < parsed.length; i++) {
                    const icon = parsed[i].icon
                    if (icon) {
                        results.set(apps[i].id, `data:image/png;base64,${icon}`)
                    }
                }
            } catch (err) {
                console.log('[Apps] Icon parse error:', err)
            }
            resolve(results)
        })
    })

    return apps.map(app => ({
        ...app,
        icon: icons.get(app.id) ?? app.icon
    }))
}

async function readCache(): Promise<ListItem[]> {
    try {
        const data = await readFile(CACHE_FILE, 'utf-8')
        return JSON.parse(data)
    } catch {
        return []
    }
}

async function writeCache(items: ListItem[]): Promise<boolean> {
    const oldCache = JSON.stringify(await readCache())
    const newCache = JSON.stringify(items)

    if (oldCache === newCache) {
        return false // No change
    }

    await mkdir(CACHE_DIR, {recursive: true})
    await writeFile(CACHE_FILE, newCache)
    return true // Changed
}

export const Apps = {
    id: 'apps',

    performPrimaryAction(item: ListItem): void {
        showItemDialog(item)
    },

    async start(onUpdate: (items: ListItem[]) => void): Promise<void> {
        // Send cached items immediately
        const cached = await readCache()
        if (cached.length > 0) {
            onUpdate(cached)
        }

        // Index with icons and update
        console.log('[Apps] Indexing...')
        const apps = await fetchApps()
        console.log('[Apps] Found:', apps.length)

        // Show with default icons if cache was empty
        if (cached.length === 0) {
            onUpdate(apps)
        }

        const appsWithIcons = await loadIcons(apps)
        if (await writeCache(appsWithIcons)) {
            onUpdate(appsWithIcons)
        }
        console.log('[Apps] Indexing complete')
    }
}
