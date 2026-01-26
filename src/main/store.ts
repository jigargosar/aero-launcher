import {ipcMain, WebContents} from 'electron'
import {channels, ListItem} from '@shared/types'
import {Apps} from './apps'

type Indexer = {
    id: string
    readCache: () => ListItem[]
    index: (onChanged: () => void) => Promise<void>
}

const indexers: Indexer[] = [Apps]

export const Store = {
    init(webContents: WebContents): void {
        const sources = new Map<string, ListItem[]>()
        let query = ''

        const getAllItems = (): ListItem[] => {
            return [...sources.values()].flat()
        }

        const filterAndSort = (list: ListItem[]): ListItem[] => {
            const filtered = query
                ? list.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
                : list
            return filtered.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
        }

        const sendFilteredItems = () => {
            webContents.send(channels.listItems, filterAndSort(getAllItems()))
        }

        const updateSource = (id: string, items: ListItem[]) => {
            sources.set(id, items)
            sendFilteredItems()
        }

        // Load caches and run indexers
        for (const indexer of indexers) {
            updateSource(indexer.id, indexer.readCache())
            indexer.index(() => updateSource(indexer.id, indexer.readCache()))
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
