import {spawn} from 'child_process'
import {promisify} from 'util'
import {exec} from 'child_process'
import {join} from 'path'
import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'

const execAsync = promisify(exec)
const SHELL_ICON_DLL = join(__dirname, 'ShellIcon.dll')

type AppEntry = {
    Name: string
    AppID: string
}

type RawApp = ListItem & {appId: string}

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
        id: `app:${a.AppID}`,
        appId: a.AppID,
        name: a.Name,
        icon: Icons.default,
    }))
}

async function loadIcons(apps: RawApp[]): Promise<RawApp[]> {
    if (apps.length === 0) return []

    const shellPaths = apps.map(a => `shell:AppsFolder\\${a.appId}`)
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

export const Apps = {
    async load(onUpdate: (items: ListItem[]) => void): Promise<void> {
        console.log('[Apps] Loading...')
        const apps = await fetchApps()
        console.log('[Apps] Found:', apps.length)

        // Emit with default icons first
        onUpdate(apps)

        // Load icons and emit again
        const appsWithIcons = await loadIcons(apps)
        onUpdate(appsWithIcons)
        console.log('[Apps] Icons loaded')
    }
}
