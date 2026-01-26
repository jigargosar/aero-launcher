import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'
import {showItemDialog} from './utils'

export const MockIndexer = {
    id: 'mock',

    performPrimaryAction(item: ListItem): void {
        showItemDialog(item)
    },

    async start(onUpdate: (items: ListItem[]) => void): Promise<void> {
        onUpdate([
            {sourceId: 'mock', id: 'mock:search', name: 'Google Search', icon: Icons.search},
            {sourceId: 'mock', id: 'mock:calculator', name: 'Calculator', icon: Icons.calculator},
            {sourceId: 'mock', id: 'mock:calendar', name: 'Calendar', icon: Icons.calendar},
            {sourceId: 'mock', id: 'mock:notes', name: 'Notes', icon: Icons.notes},
            {sourceId: 'mock', id: 'mock:settings', name: 'Settings', icon: Icons.settings},
            {sourceId: 'mock', id: 'mock:terminal', name: 'Terminal', icon: Icons.terminal},
            {sourceId: 'mock', id: 'mock:folder', name: 'Files', icon: Icons.folder},
            {sourceId: 'mock', id: 'mock:music', name: 'Music', icon: Icons.music},
        ])
    }
}
