import {ipcMain, WebContents} from 'electron'
import {channels, ListItem} from '@shared/types'
import {Apps} from './apps'

export const Store = {
    init(webContents: WebContents): void {
        let items: ListItem[] = []
        let query = ''

        const sendFilteredItems = () => {
            const filtered = query
                ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
                : items
            webContents.send(channels.listItems, filtered)
        }

        const updateItems = (newItems: ListItem[]) => {
            items = newItems
            sendFilteredItems()
        }

        // Load apps
        Apps.load(updateItems)

        ipcMain.on(channels.requestListItems, () => {
            sendFilteredItems()
        })

        ipcMain.on(channels.setQuery, (_, q: string) => {
            query = q
            sendFilteredItems()
        })
    }
}
