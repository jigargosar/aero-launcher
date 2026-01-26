import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'

export const MockIndexer = {
    id: 'mock',

    async load(onUpdate: (items: ListItem[]) => void): Promise<void> {
        onUpdate([
            {id: 'mock:search', name: 'Google Search', icon: Icons.search},
            {id: 'mock:calculator', name: 'Calculator', icon: Icons.calculator},
            {id: 'mock:calendar', name: 'Calendar', icon: Icons.calendar},
            {id: 'mock:notes', name: 'Notes', icon: Icons.notes},
            {id: 'mock:settings', name: 'Settings', icon: Icons.settings},
            {id: 'mock:terminal', name: 'Terminal', icon: Icons.terminal},
            {id: 'mock:folder', name: 'Files', icon: Icons.folder},
            {id: 'mock:music', name: 'Music', icon: Icons.music},
        ])
    }
}
