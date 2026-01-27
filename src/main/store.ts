import {BrowserWindow, ipcMain} from 'electron'
import {channels, ListItem} from '@shared/types'
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
        // State
        const state = {
            sources: new Map<string, ListItem[]>(),
            query: '',
            initialized: false,
            ranking: createRankingContext(),
        }

        // Derived
        const getItems = () => filterAndSort([...state.sources.values()].flat(), state.query, state.ranking)

        // Commit state to renderer
        const commit = () => {
            if (state.initialized) {
                window.webContents.send(channels.listItems, getItems())
            }
        }

        // Start indexers
        Promise.all(
            indexers.map(indexer =>
                indexer.start(items => {
                    state.sources.set(indexer.id, items)
                    commit()
                }).catch(err => console.error(`[Store] ${indexer.id} failed:`, err))
            )
        ).then(() => {
            state.initialized = true
            commit()
        })

        // IPC
        ipcMain.on(channels.requestListItems, commit)

        ipcMain.on(channels.setQuery, (_, q: string) => {
            state.query = q
            commit()
        })

        ipcMain.on(channels.performPrimaryAction, (_, item: ListItem) => {
            const indexer = indexers.find(i => i.id === item.sourceId)
            if (!indexer) return
            recordSelection(state.ranking, state.query, item.id)
            window.blur()
            window.hide()
            indexer.performPrimaryAction(item)
        })

        ipcMain.on(channels.hideWindow, () => {
            window.blur()
            window.hide()
        })
    }
}
