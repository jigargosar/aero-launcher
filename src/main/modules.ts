import { Item, Module, Trigger, Response } from '@shared/types'
import { Icons } from '@shared/icons'

// === Module Registry ===

const modules = new Map<string, Module>()

export function registerModule(module: Module): void {
    modules.set(module.id, module)
}

export function getModule(moduleId: string): Module | undefined {
    return modules.get(moduleId)
}

export async function handleTrigger(item: Item, trigger: Trigger): Promise<Response> {
    const module = modules.get(item.moduleId)
    if (!module) return { type: 'noop' }
    return module.onTrigger(item, trigger)
}

// === Mock Data ===

const MOCK_APPS: Item[] = [
    { id: 'app-chrome', name: 'Google Chrome', icon: Icons.app, moduleId: 'app', metadata: { path: 'chrome.exe' }, triggers: ['execute', 'actionMenu'] },
    { id: 'app-vscode', name: 'Visual Studio Code', icon: Icons.app, moduleId: 'app', metadata: { path: 'code.exe' }, triggers: ['execute', 'actionMenu'] },
    { id: 'app-terminal', name: 'Windows Terminal', icon: Icons.app, moduleId: 'app', metadata: { path: 'wt.exe' }, triggers: ['execute', 'actionMenu'] },
    { id: 'app-spotify', name: 'Spotify', icon: Icons.app, moduleId: 'app', metadata: { path: 'spotify.exe' }, triggers: ['execute', 'actionMenu'] },
    { id: 'app-slack', name: 'Slack', icon: Icons.app, moduleId: 'app', metadata: { path: 'slack.exe' }, triggers: ['execute', 'actionMenu'] },
    { id: 'app-discord', name: 'Discord', icon: Icons.app, moduleId: 'app', metadata: { path: 'discord.exe' }, triggers: ['execute', 'actionMenu'] },
    { id: 'app-notion', name: 'Notion', icon: Icons.app, moduleId: 'app', metadata: { path: 'notion.exe' }, triggers: ['execute', 'actionMenu'] },
    { id: 'app-figma', name: 'Figma', icon: Icons.app, moduleId: 'app', metadata: { path: 'figma.exe' }, triggers: ['execute', 'actionMenu'] },
]

const MOCK_FOLDERS: Item[] = [
    { id: 'folder-docs', name: 'Documents', icon: Icons.folder, moduleId: 'folder', metadata: { path: 'C:\\Users\\jigar\\Documents', kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
    { id: 'folder-downloads', name: 'Downloads', icon: Icons.folder, moduleId: 'folder', metadata: { path: 'C:\\Users\\jigar\\Downloads', kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
    { id: 'folder-desktop', name: 'Desktop', icon: Icons.folder, moduleId: 'folder', metadata: { path: 'C:\\Users\\jigar\\Desktop', kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
    { id: 'folder-projects', name: 'Projects', icon: Icons.folder, moduleId: 'folder', metadata: { path: 'C:\\Users\\jigar\\projects', kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
]

const WEBSEARCH_TEMPLATES: Item[] = [
    { id: 'ws-google', name: 'Google Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://google.com/search?q={query}' }, triggers: ['browse'] },
    { id: 'ws-ddg', name: 'DuckDuckGo', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://duckduckgo.com/?q={query}' }, triggers: ['browse'] },
    { id: 'ws-youtube', name: 'YouTube', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://youtube.com/results?search_query={query}' }, triggers: ['browse'] },
    { id: 'ws-github', name: 'GitHub', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://github.com/search?q={query}' }, triggers: ['browse'] },
    { id: 'ws-npm', name: 'npm', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://www.npmjs.com/search?q={query}' }, triggers: ['browse'] },
]

// === App Module ===

const appModule: Module = {
    id: 'app',
    onTrigger: async (item, trigger) => {
        if (trigger.type === 'execute') {
            console.log(`[app] Launching: ${item.metadata.path}`)
            return { type: 'hide' }
        }
        if (trigger.type === 'actionMenu') {
            return {
                type: 'pushList',
                items: [
                    { id: `${item.id}-open`, name: 'Open', icon: Icons.action, moduleId: 'command', metadata: { action: 'open', target: item }, triggers: ['execute'] },
                    { id: `${item.id}-admin`, name: 'Run as Administrator', icon: Icons.action, moduleId: 'command', metadata: { action: 'admin', target: item }, triggers: ['execute'] },
                    { id: `${item.id}-location`, name: 'Open File Location', icon: Icons.action, moduleId: 'command', metadata: { action: 'reveal', target: item }, triggers: ['execute'] },
                ],
            }
        }
        return { type: 'noop' }
    },
}

// === Folder Module ===

const folderModule: Module = {
    id: 'folder',
    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string

        if (kind === 'folder') {
            if (trigger.type === 'execute') {
                console.log(`[folder] Opening: ${item.metadata.path}`)
                return { type: 'hide' }
            }
            if (trigger.type === 'browse') {
                // Mock children
                const children: Item[] = [
                    { id: `${item.id}-file1`, name: 'readme.txt', icon: Icons.file, moduleId: 'folder', metadata: { path: `${item.metadata.path}\\readme.txt`, kind: 'file' }, triggers: ['execute', 'actionMenu'] },
                    { id: `${item.id}-file2`, name: 'notes.md', icon: Icons.file, moduleId: 'folder', metadata: { path: `${item.metadata.path}\\notes.md`, kind: 'file' }, triggers: ['execute', 'actionMenu'] },
                    { id: `${item.id}-sub`, name: 'subfolder', icon: Icons.folder, moduleId: 'folder', metadata: { path: `${item.metadata.path}\\subfolder`, kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
                ]
                return { type: 'pushList', items: children }
            }
            if (trigger.type === 'actionMenu') {
                return {
                    type: 'pushList',
                    items: [
                        { id: `${item.id}-open`, name: 'Open', icon: Icons.action, moduleId: 'command', metadata: { action: 'open', target: item }, triggers: ['execute'] },
                        { id: `${item.id}-terminal`, name: 'Open in Terminal', icon: Icons.action, moduleId: 'command', metadata: { action: 'terminal', target: item }, triggers: ['execute'] },
                        { id: `${item.id}-rename`, name: 'Rename', icon: Icons.action, moduleId: 'folder', metadata: { kind: 'rename', targetPath: item.metadata.path }, triggers: ['execute'] },
                    ],
                }
            }
        }

        if (kind === 'file') {
            if (trigger.type === 'execute') {
                console.log(`[folder] Opening file: ${item.metadata.path}`)
                return { type: 'hide' }
            }
            if (trigger.type === 'actionMenu') {
                return {
                    type: 'pushList',
                    items: [
                        { id: `${item.id}-open`, name: 'Open', icon: Icons.action, moduleId: 'command', metadata: { action: 'open', target: item }, triggers: ['execute'] },
                        { id: `${item.id}-reveal`, name: 'Reveal in Explorer', icon: Icons.action, moduleId: 'command', metadata: { action: 'reveal', target: item }, triggers: ['execute'] },
                        { id: `${item.id}-copy`, name: 'Copy Path', icon: Icons.action, moduleId: 'command', metadata: { action: 'copyPath', target: item }, triggers: ['execute'] },
                    ],
                }
            }
        }

        if (kind === 'rename') {
            if (trigger.type === 'execute') {
                return { type: 'pushInput', placeholder: 'New name...' }
            }
            if (trigger.type === 'textChange') {
                // Show preview of rename
                return { type: 'noop' }
            }
        }

        return { type: 'noop' }
    },
}

// === Websearch Module ===

const websearchModule: Module = {
    id: 'websearch',
    onTrigger: async (item, trigger) => {
        if (trigger.type === 'browse') {
            return { type: 'pushInput', placeholder: `Search ${item.name}...` }
        }
        if (trigger.type === 'textChange') {
            const query = trigger.text
            if (!query) return { type: 'updateItems', items: [] }
            // Show suggestions
            const suggestions: Item[] = [
                { id: `${item.id}-s1`, name: query, icon: Icons.search, moduleId: 'websearch', metadata: { url: (item.metadata.url as string).replace('{query}', encodeURIComponent(query)), kind: 'suggestion' }, triggers: ['execute'] },
                { id: `${item.id}-s2`, name: `${query} tutorial`, icon: Icons.search, moduleId: 'websearch', metadata: { url: (item.metadata.url as string).replace('{query}', encodeURIComponent(`${query} tutorial`)), kind: 'suggestion' }, triggers: ['execute'] },
                { id: `${item.id}-s3`, name: `${query} examples`, icon: Icons.search, moduleId: 'websearch', metadata: { url: (item.metadata.url as string).replace('{query}', encodeURIComponent(`${query} examples`)), kind: 'suggestion' }, triggers: ['execute'] },
            ]
            return { type: 'updateItems', items: suggestions }
        }
        if (trigger.type === 'execute') {
            const kind = item.metadata.kind
            if (kind === 'suggestion') {
                console.log(`[websearch] Opening: ${item.metadata.url}`)
                return { type: 'hide' }
            }
        }
        return { type: 'noop' }
    },
}

// === Command Module (actions) ===

const commandModule: Module = {
    id: 'command',
    onTrigger: async (item, trigger) => {
        if (trigger.type === 'execute') {
            const action = item.metadata.action as string
            const target = item.metadata.target as Item
            console.log(`[command] Executing: ${action} on ${target?.name ?? 'unknown'}`)
            return { type: 'hide' }
        }
        return { type: 'noop' }
    },
}

// === Get Root Items ===

export function getRootItems(): Item[] {
    return [...MOCK_APPS, ...MOCK_FOLDERS, ...WEBSEARCH_TEMPLATES]
}

// === Register All Modules ===

registerModule(appModule)
registerModule(folderModule)
registerModule(websearchModule)
registerModule(commandModule)
