import {ipcMain, WebContents} from 'electron'
import {channels, ListItem} from '@shared/types'
import {Icons} from '@shared/icons'

export const Store = {
    init(webContents: WebContents): void {
        const items: ListItem[] = [
            {id: '1', name: 'Google Search', icon: Icons.search},
            {id: '2', name: 'Calculator', icon: Icons.calculator},
            {id: '3', name: 'Calendar', icon: Icons.calendar},
            {id: '4', name: 'Notes', icon: Icons.notes},
            {id: '5', name: 'Settings', icon: Icons.settings},
            {id: '6', name: 'Terminal', icon: Icons.terminal},
            {id: '7', name: 'Files', icon: Icons.folder},
            {id: '8', name: 'Music', icon: Icons.music},
        ]

        let query = ''

        const sendFilteredItems = () => {
            const filtered = query
                ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
                : items
            webContents.send(channels.listItems, filtered)
        }

        ipcMain.on(channels.requestListItems, () => {
            sendFilteredItems()
        })

        ipcMain.on(channels.setQuery, (_, q: string) => {
            query = q
            sendFilteredItems()
        })
    }
}
