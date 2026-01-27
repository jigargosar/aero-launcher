import {BrowserWindow, ipcMain} from 'electron'
import {channels, ListItem, ListState} from '@shared/types'
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
        let selectedIndex = 0
        let lastTopItemId: string | null = null

        const rankingContext = createRankingContext()

        const getAllItems = (): ListItem[] => {
            return [...sources.values()].flat()
        }

        const getFilteredItems = (): ListItem[] => {
            return filterAndSort(getAllItems(), query, rankingContext)
        }

        let firstTime = true
        const sendState = () => {
            if (config.debugDelayFirstRender && firstTime) {
                firstTime = false
                setTimeout(sendStateToRenderer, 4 * 1000)
            } else {
                sendStateToRenderer()
            }

            function sendStateToRenderer() {
                const items = getFilteredItems()
                // Keep selectedIndex in bounds
                selectedIndex = Math.min(selectedIndex, Math.max(0, items.length - 1))
                lastTopItemId = items[0]?.id ?? null
                const state: ListState = {items, selectedIndex}
                webContents.send(channels.listState, state)
            }
        }

        let initialized = false

        const updateSource = (id: string, items: ListItem[]) => {
            sources.set(id, items)
            if (initialized) {
                sendState()
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
            sendState()
        }).catch(err => console.error('[Store] Indexers failed:', err))

        ipcMain.on(channels.requestListState, () => {
            sendState()
        })

        ipcMain.on(channels.setQuery, (_, q: string) => {
            query = q
            selectedIndex = 0
            sendState()
        })

        ipcMain.on(channels.setSelectedIndex, (_, index: number) => {
            selectedIndex = index
            sendState()
        })

        ipcMain.on(channels.performPrimaryAction, (_, item: ListItem) => {
            const indexer = indexers.find(i => i.id === item.sourceId)
            if (indexer) {
                recordSelection(rankingContext, query, item.id)
                // Check if priority changed (top item will be different)
                const newItems = getFilteredItems()
                const newTopId = newItems[0]?.id ?? null
                if (newTopId !== lastTopItemId) {
                    selectedIndex = 0
                }
                // Hide first to avoid layout shift, then update state
                window.blur()
                window.hide()
                sendState()
                indexer.performPrimaryAction(item)
                // TODO: If launched apps don't get focus, try delaying hide:
                // setTimeout(() => { window.blur(); window.hide() }, 100)
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
