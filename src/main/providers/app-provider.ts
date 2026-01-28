import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

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

export const appProvider: Provider = {
    id: 'app',

    getRootItems: () => MOCK_APPS,

    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string | undefined

        // Action menu item
        if (kind === 'action') {
            if (trigger.type === 'execute') {
                const action = item.metadata.action as string
                const targetPath = item.metadata.targetPath as string
                console.log(`[app] Action: ${action} on ${targetPath}`)
                return { type: 'hide' }
            }
            return { type: 'noop' }
        }

        // Regular app item
        if (trigger.type === 'execute') {
            console.log(`[app] Launching: ${item.metadata.path}`)
            return { type: 'hide' }
        }

        if (trigger.type === 'actionMenu') {
            const path = item.metadata.path as string
            return {
                type: 'pushList',
                items: [
                    { id: `${item.id}-open`, name: 'Open', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'open', targetPath: path }, triggers: ['execute'] },
                    { id: `${item.id}-admin`, name: 'Run as Administrator', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'admin', targetPath: path }, triggers: ['execute'] },
                    { id: `${item.id}-location`, name: 'Open File Location', icon: Icons.action, moduleId: 'app', metadata: { kind: 'action', action: 'reveal', targetPath: path }, triggers: ['execute'] },
                ],
            }
        }

        return { type: 'noop' }
    },
}
