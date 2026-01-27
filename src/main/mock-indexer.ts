import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'
import {showItemDialog} from './utils'
import {StoreAPI} from './store'

export const MockIndexer = {
    id: 'mock',

    async start(onUpdate: (items: ListItem[]) => void, store: StoreAPI): Promise<void> {
        // Register execute handler
        store.registerExecuteHandler('mock', (item) => {
            showItemDialog(item)
        })

        onUpdate([
            {sourceId: 'mock', id: 'mock:search', name: 'Google Search', icon: Icons.search, actions: [{type: 'execute'}]},
            {sourceId: 'mock', id: 'mock:calculator', name: 'Calculator', icon: Icons.calculator, actions: [{type: 'execute'}]},
            {sourceId: 'mock', id: 'mock:calendar', name: 'Calendar', icon: Icons.calendar, actions: [{type: 'execute'}]},
            {sourceId: 'mock', id: 'mock:notes', name: 'Notes', icon: Icons.notes, actions: [{type: 'execute'}]},
            {sourceId: 'mock', id: 'mock:settings', name: 'Settings', icon: Icons.settings, actions: [{type: 'execute'}]},
            {sourceId: 'mock', id: 'mock:terminal', name: 'Terminal', icon: Icons.terminal, actions: [{type: 'execute'}]},
            {sourceId: 'mock', id: 'mock:folder', name: 'Files', icon: Icons.folder, actions: [{type: 'execute'}]},
            {sourceId: 'mock', id: 'mock:music', name: 'Music', icon: Icons.music, actions: [{type: 'execute'}]},
        ])
    }
}
