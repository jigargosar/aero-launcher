import {ipcMain, WebContents} from 'electron'
import {channels, ListItem} from '@shared/types'
import {Apps} from './apps'

export const Store = {
    init(webContents: WebContents): void {
        let items: ListItem[] = []
        let query = ''

        const filterAndSort = (list: ListItem[]): ListItem[] => {
            const filtered = query
                ? list.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
                : list
            return filtered.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
        }

        const sendFilteredItems = () => {
            webContents.send(channels.listItems, filterAndSort(items))
        }

        const refreshFromCache = () => {
            items = Apps.readCache()
            sendFilteredItems()
        }

        // Load from cache immediately
        refreshFromCache()

        // Run indexer in background
        Apps.index(refreshFromCache)

        ipcMain.on(channels.requestListItems, () => {
            sendFilteredItems()
        })

        ipcMain.on(channels.setQuery, (_, q: string) => {
            query = q
            sendFilteredItems()
        })
    }
}
