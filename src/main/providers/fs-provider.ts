import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

const MOCK_FS: Item[] = [
    { id: 'fs-docs', name: 'Documents', icon: Icons.folder, moduleId: 'fs', metadata: { path: 'C:\\Users\\jigar\\Documents', kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
    { id: 'fs-downloads', name: 'Downloads', icon: Icons.folder, moduleId: 'fs', metadata: { path: 'C:\\Users\\jigar\\Downloads', kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
    { id: 'fs-desktop', name: 'Desktop', icon: Icons.folder, moduleId: 'fs', metadata: { path: 'C:\\Users\\jigar\\Desktop', kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
    { id: 'fs-projects', name: 'Projects', icon: Icons.folder, moduleId: 'fs', metadata: { path: 'C:\\Users\\jigar\\projects', kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
]

export const fsProvider: Provider = {
    id: 'fs',

    getRootItems: () => MOCK_FS,

    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string

        // Action
        if (kind === 'action') {
            const action = item.metadata.action as string
            if (trigger.type === 'execute') {
                if (action === 'rename') {
                    return { type: 'pushInput', placeholder: 'New name...' }
                }
                console.log(`[fs] Action: ${action} on ${item.metadata.targetPath}`)
                return { type: 'hide' }
            }
            if (trigger.type === 'textChange') {
                // Rename confirmation would go here
                return { type: 'noop' }
            }
            return { type: 'noop' }
        }

        // Folder
        if (kind === 'folder') {
            if (trigger.type === 'execute') {
                console.log(`[fs] Opening folder: ${item.metadata.path}`)
                return { type: 'hide' }
            }
            if (trigger.type === 'browse') {
                const path = item.metadata.path as string
                const children: Item[] = [
                    { id: `${item.id}-file1`, name: 'readme.txt', icon: Icons.file, moduleId: 'fs', metadata: { path: `${path}\\readme.txt`, kind: 'file' }, triggers: ['execute', 'actionMenu'] },
                    { id: `${item.id}-file2`, name: 'notes.md', icon: Icons.file, moduleId: 'fs', metadata: { path: `${path}\\notes.md`, kind: 'file' }, triggers: ['execute', 'actionMenu'] },
                    { id: `${item.id}-sub`, name: 'subfolder', icon: Icons.folder, moduleId: 'fs', metadata: { path: `${path}\\subfolder`, kind: 'folder' }, triggers: ['execute', 'browse', 'actionMenu'] },
                ]
                return { type: 'pushList', items: children }
            }
            if (trigger.type === 'actionMenu') {
                const path = item.metadata.path as string
                return {
                    type: 'pushList',
                    items: [
                        { id: `${item.id}-open`, name: 'Open', icon: Icons.action, moduleId: 'fs', metadata: { kind: 'action', action: 'open', targetPath: path }, triggers: ['execute'] },
                        { id: `${item.id}-terminal`, name: 'Open in Terminal', icon: Icons.action, moduleId: 'fs', metadata: { kind: 'action', action: 'terminal', targetPath: path }, triggers: ['execute'] },
                        { id: `${item.id}-rename`, name: 'Rename', icon: Icons.action, moduleId: 'fs', metadata: { kind: 'action', action: 'rename', targetPath: path }, triggers: ['execute'] },
                    ],
                }
            }
        }

        // File
        if (kind === 'file') {
            if (trigger.type === 'execute') {
                console.log(`[fs] Opening file: ${item.metadata.path}`)
                return { type: 'hide' }
            }
            if (trigger.type === 'actionMenu') {
                const path = item.metadata.path as string
                return {
                    type: 'pushList',
                    items: [
                        { id: `${item.id}-open`, name: 'Open', icon: Icons.action, moduleId: 'fs', metadata: { kind: 'action', action: 'open', targetPath: path }, triggers: ['execute'] },
                        { id: `${item.id}-reveal`, name: 'Reveal in Explorer', icon: Icons.action, moduleId: 'fs', metadata: { kind: 'action', action: 'reveal', targetPath: path }, triggers: ['execute'] },
                        { id: `${item.id}-copy`, name: 'Copy Path', icon: Icons.action, moduleId: 'fs', metadata: { kind: 'action', action: 'copyPath', targetPath: path }, triggers: ['execute'] },
                    ],
                }
            }
        }

        return { type: 'noop' }
    },
}
