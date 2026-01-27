import { BrowserWindow, ipcMain } from 'electron'
import { channels, ListItem, ListMode } from '@shared/types'
import { config } from '@shared/config'
import { Apps } from './apps-indexer'
import { WebSearch } from './websearch-indexer'
import { createRankingContext, filterAndSort, recordSelection } from './ranking' // === Handler Types ===

// === Handler Types ===

type ExecuteHandler = (item: ListItem) => void

type InputHandler = {
    onQuery: (item: ListItem, text: string, emit: (suggestions: ListItem[]) => void) => void
    onSubmit: (item: ListItem, text: string) => void
}

// === Store API (passed to indexers) ===

export type StoreAPI = {
    registerExecuteHandler: (sourceId: string, handler: ExecuteHandler) => void
    registerInputHandler: (sourceId: string, handler: InputHandler) => void
}

// === Indexer Type ===

type Indexer = {
    id: string
    start: (onUpdate: (items: ListItem[]) => void, store: StoreAPI) => Promise<void>
}

// === Store Mode (internal state) ===

type StoreMode =
    | { tag: 'normal' }
    | { tag: 'input'; item: ListItem; text: string; suggestions: ListItem[] }

// === Indexers ===

const indexers: Indexer[] = [
    Apps,
    // MockIndexer,
    WebSearch,
]

// === Store ===

export const Store = {
    init(window: BrowserWindow): void {
        const webContents = window.webContents

        // Handler registries
        const executeHandlers = new Map<string, ExecuteHandler>()
        const inputHandlers = new Map<string, InputHandler>()

        // Store API for indexers
        const storeAPI: StoreAPI = {
            registerExecuteHandler: (sourceId, handler) => {
                executeHandlers.set(sourceId, handler)
            },
            registerInputHandler: (sourceId, handler) => {
                inputHandlers.set(sourceId, handler)
            },
        }

        // State
        const sources = new Map<string, ListItem[]>()
        let query = ''
        let selectedIndex = 0
        let lastTopItemId: string | null = null
        let mode: StoreMode = { tag: 'normal' }

        const rankingContext = createRankingContext()

        const getAllItems = (): ListItem[] => {
            return [...sources.values()].flat()
        }

        const getFilteredItems = (): ListItem[] => {
            return filterAndSort(getAllItems(), query, rankingContext)
        }

        let firstTime = true
        const sendMode = () => {
            if (config.debugDelayFirstRender && firstTime) {
                firstTime = false
                setTimeout(sendModeToRenderer, 4 * 1000)
            } else {
                sendModeToRenderer()
            }

            function sendModeToRenderer() {
                let listMode: ListMode

                if (mode.tag === 'input') {
                    const inputAction = mode.item.actions.find((a) => a.type === 'input')
                    const placeholder = inputAction?.type === 'input' ? inputAction.placeholder : ''
                    listMode = {
                        tag: 'input',
                        item: mode.item,
                        text: mode.text,
                        placeholder,
                        suggestions: mode.suggestions,
                        selectedIndex,
                    }
                } else {
                    const items = getFilteredItems()
                    // Keep selectedIndex in bounds
                    selectedIndex = Math.min(selectedIndex, Math.max(0, items.length - 1))
                    lastTopItemId = items[0]?.id ?? null
                    listMode = {
                        tag: 'normal',
                        items,
                        selectedIndex,
                    }
                }

                webContents.send(channels.listMode, listMode)
            }
        }

        let initialized = false

        const updateSource = (id: string, items: ListItem[]) => {
            sources.set(id, items)
            if (initialized) {
                sendMode()
            }
        }

        // Start indexers
        Promise.all(
            indexers.map((indexer) =>
                indexer
                    .start((items) => updateSource(indexer.id, items), storeAPI)
                    .catch((err) => console.error(`[Store] ${indexer.id} failed:`, err)),
            ),
        )
            .then(() => {
                initialized = true
                sendMode()
            })
            .catch((err) => console.error('[Store] Indexers failed:', err))

        // === IPC Handlers ===

        ipcMain.on(channels.requestListMode, () => {
            sendMode()
        })

        ipcMain.on(channels.setQuery, (_, q: string) => {
            query = q
            selectedIndex = 0
            sendMode()
        })

        ipcMain.on(channels.setSelectedIndex, (_, index: number) => {
            selectedIndex = index
            sendMode()
        })

        ipcMain.on(channels.executeItem, (_, item: ListItem) => {
            const handler = executeHandlers.get(item.sourceId)
            if (handler) {
                recordSelection(rankingContext, query, item.id)
                // Check if priority changed
                const newItems = getFilteredItems()
                const newTopId = newItems[0]?.id ?? null
                if (newTopId !== lastTopItemId) {
                    selectedIndex = 0
                }
                // Hide first to avoid layout shift
                window.blur()
                window.hide()
                sendMode()
                handler(item)
                // TODO: If launched apps don't get focus, try delaying hide:
                // setTimeout(() => { window.blur(); window.hide() }, 100)
            } else {
                console.error(`[Store] No execute handler for sourceId: ${item.sourceId}`)
            }
        })

        ipcMain.on(channels.enterInputMode, (_, item: ListItem) => {
            const hasInputAction = item.actions.some((a) => a.type === 'input')
            if (hasInputAction) {
                recordSelection(rankingContext, query, item.id)
                mode = { tag: 'input', item, text: '', suggestions: [] }
                selectedIndex = 0
                sendMode()
            }
        })

        ipcMain.on(channels.setInputText, (_, text: string) => {
            if (mode.tag === 'input') {
                mode = { ...mode, text }
                const handler = inputHandlers.get(mode.item.sourceId)
                if (handler) {
                    handler.onQuery(mode.item, text, (suggestions) => {
                        if (mode.tag === 'input') {
                            mode = { ...mode, suggestions }
                            sendMode()
                        }
                    })
                } else {
                    console.error(`[Store] No input handler for sourceId: ${mode.item.sourceId}`)
                }
                sendMode()
            }
        })

        ipcMain.on(channels.submitInput, () => {
            if (mode.tag === 'input') {
                const handler = inputHandlers.get(mode.item.sourceId)
                if (handler) {
                    window.blur()
                    window.hide()
                    handler.onSubmit(mode.item, mode.text)
                } else {
                    console.error(`[Store] No input handler for sourceId: ${mode.item.sourceId}`)
                }
                mode = { tag: 'normal' }
                sendMode()
            }
        })

        ipcMain.on(channels.exitInputMode, () => {
            if (mode.tag === 'input') {
                mode = { tag: 'normal' }
                sendMode()
            }
        })

        ipcMain.on(channels.hideWindow, () => {
            window.blur()
            window.hide()
        })
    },
}
