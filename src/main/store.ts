import {BrowserWindow, ipcMain} from 'electron'
import {channels, ListItem} from '@shared/types'
import {config} from '@shared/config'
import {Apps} from './apps-indexer'
import {MockIndexer} from './mock-indexer'
import {createRankingContext, filterAndSort, recordSelection} from './ranking'

type Indexer = {
    id: string
    start: (onUpdate: (items: ListItem[]) => void) => Promise<void>
    performPrimaryAction: (item: ListItem) => void
}

const indexers: Indexer[] = [Apps, MockIndexer]

export const Store = {
    init(window: BrowserWindow): void {
        const webContents = window.webContents
        const sources = new Map<string, ListItem[]>()
        let query = ''

        const rankingContext = createRankingContext()

        const getAllItems = (): ListItem[] => {
            return [...sources.values()].flat()
        }
        let firstTime = true
        const sendFilteredItems = () => {
            if (config.debugDelayFirstRender && firstTime) {
                firstTime = false
                setTimeout(sendItemsToRenderer, 4 * 1000)
            } else {
                sendItemsToRenderer()
            }

            function sendItemsToRenderer() {
                webContents.send(channels.listItems, filterAndSort(getAllItems(), query, rankingContext))
            }
        }

        let initialized = false

        const updateSource = (id: string, items: ListItem[]) => {
            sources.set(id, items)
            if (initialized) {
                sendFilteredItems()
            }
        }

        // Start indexers
        Promise.all(
            indexers.map(indexer =>
                indexer.start((items) => updateSource(indexer.id, items))
                    .catch(err => console.error(`[Store] ${indexer.id} failed:`, err))
            )
        ).then(() => {
            initialized = true
            sendFilteredItems()
        }).catch(err => console.error('[Store] Indexers failed:', err))

        ipcMain.on(channels.requestListItems, () => {
            sendFilteredItems()
        })

        ipcMain.on(channels.setQuery, (_, q: string) => {
            query = q
            sendFilteredItems()
        })

        ipcMain.on(channels.performPrimaryAction, (_, item: ListItem) => {
            const indexer = indexers.find(i => i.id === item.sourceId)
            if (indexer) {
                recordSelection(rankingContext, query, item.id)
                setTimeout(() => {
                    window.blur()
                    window.hide()
                }, 100)
                indexer.performPrimaryAction(item)
            } else {
                console.error(`[Store] No indexer found for sourceId: ${item.sourceId}`)
            }
        })

        ipcMain.on(channels.hideWindow, () => {
            window.blur()
            window.hide()
        })
    }
}
