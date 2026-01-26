import {ipcMain, WebContents} from 'electron'
import {channels, ListItem} from '@shared/types'
import {Apps} from './apps-indexer'
import {MockIndexer} from './mock-indexer'

type Indexer = {
    id: string
    load: (onUpdate: (items: ListItem[]) => void) => Promise<void>
}

const indexers: Indexer[] = [Apps, MockIndexer]

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

        // Load indexers
        Promise.all(
            indexers.map(indexer =>
                indexer.load((items) => updateSource(indexer.id, items))
                    .catch(err => console.error(`[Store] ${indexer.id} failed:`, err))
            )
        ).catch(err => console.error('[Store] Indexers failed:', err))

        ipcMain.on(channels.requestListItems, () => {
            sendFilteredItems()
        })

        ipcMain.on(channels.setQuery, (_, q: string) => {
            query = q
            sendFilteredItems()
        })
    }
}
