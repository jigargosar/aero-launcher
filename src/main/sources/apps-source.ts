import {ListItem, SimpleSource} from '@shared/types'
import {Icons} from '@shared/icons'
import {shell} from 'electron'

// Mock apps data
const mockApps: ListItem[] = [
    {sourceId: 'apps', id: 'apps:safari', name: 'Safari', icon: Icons.app},
    {sourceId: 'apps', id: 'apps:chrome', name: 'Google Chrome', icon: Icons.app},
    {sourceId: 'apps', id: 'apps:firefox', name: 'Firefox', icon: Icons.app},
    {sourceId: 'apps', id: 'apps:vscode', name: 'Visual Studio Code', icon: Icons.app},
    {sourceId: 'apps', id: 'apps:terminal', name: 'Terminal', icon: Icons.app},
    {sourceId: 'apps', id: 'apps:finder', name: 'Finder', icon: Icons.app},
    {sourceId: 'apps', id: 'apps:notes', name: 'Notes', icon: Icons.app},
    {sourceId: 'apps', id: 'apps:calendar', name: 'Calendar', icon: Icons.app},
]

export const appsSource: SimpleSource = {
    type: 'simple',
    id: 'apps',

    getItems: (query) => {
        if (!query) return mockApps
        const q = query.toLowerCase()
        return mockApps.filter(app => app.name.toLowerCase().includes(q))
    },

    execute: (item) => {
        console.log(`[Apps] Launching: ${item.name}`)
        // In real impl: shell.openPath(item.metadata.path)
    },
}
