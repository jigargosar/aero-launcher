import {BrowserWindow, ipcMain} from 'electron'
import {channels, ListItem, UIState, Source} from '@shared/types'
import {config} from '@shared/config'
import {appsSource} from './sources/apps-source'
import {websearchSource} from './sources/websearch-source'
import {createRankingContext, filterAndSort, recordSelection} from './ranking'

// === Store Context (internal state) ===

type StoreContext =
    | {tag: 'root'; filterQuery: string}
    | {tag: 'input'; parent: ListItem; text: string; items: ListItem[]}

// === Sources ===

const sources: Source[] = [appsSource, websearchSource]

// === Store ===

export const Store = {
    init(window: BrowserWindow): void {
        const webContents = window.webContents

        // Source lookup by id
        const sourceMap = new Map<string, Source>(sources.map(s => [s.id, s]))

        // Root items from each source
        const rootItems = new Map<string, ListItem[]>()

        // State
        let context: StoreContext = {tag: 'root', filterQuery: ''}
        let selectedIndex = 0
        let lastTopItemId: string | null = null

        const rankingContext = createRankingContext()

        const getAllRootItems = (): ListItem[] => {
            return [...rootItems.values()].flat()
        }

        const getFilteredRootItems = (): ListItem[] => {
            return filterAndSort(getAllRootItems(), context.tag === 'root' ? context.filterQuery : '', rankingContext)
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
                let state: UIState

                if (context.tag === 'input') {
                    const placeholder = context.parent.metadata?.placeholder ?? 'Type to search...'
                    state = {
                        tag: 'input',
                        parent: context.parent,
                        placeholder,
                        text: context.text,
                        items: context.items,
                        selectedIndex,
                    }
                } else {
                    const items = getFilteredRootItems()
                    selectedIndex = Math.min(selectedIndex, Math.max(0, items.length - 1))
                    lastTopItemId = items[0]?.id ?? null
                    state = {
                        tag: 'root',
                        items,
                        selectedIndex,
                        filterQuery: context.filterQuery,
                    }
                }

                webContents.send(channels.state, state)
            }
        }

        let initialized = false

        const updateRootItems = (sourceId: string, items: ListItem[]) => {
            rootItems.set(sourceId, items)
            if (initialized && context.tag === 'root') {
                sendState()
            }
        }

        // Start sources
        Promise.all(
            sources.map(source =>
                Promise.resolve(source.onStart(items => updateRootItems(source.id, items)))
                    .catch(err => console.error(`[Store] ${source.id} failed:`, err))
            )
        )
            .then(() => {
                initialized = true
                sendState()
            })
            .catch(err => console.error('[Store] Sources failed:', err))

        // === IPC Handlers ===

        ipcMain.on(channels.requestState, () => {
            sendState()
        })

        ipcMain.on(channels.setFilterQuery, (_, query: string) => {
            if (context.tag === 'root') {
                context = {tag: 'root', filterQuery: query}
                selectedIndex = 0
                sendState()
            }
        })

        ipcMain.on(channels.setSelectedIndex, (_, index: number) => {
            selectedIndex = index
            sendState()
        })

        ipcMain.on(channels.execute, (_, item: ListItem) => {
            const source = sourceMap.get(item.sourceId)
            if (source) {
                if (context.tag === 'root') {
                    recordSelection(rankingContext, context.filterQuery, item.id)
                    const newItems = getFilteredRootItems()
                    const newTopId = newItems[0]?.id ?? null
                    if (newTopId !== lastTopItemId) {
                        selectedIndex = 0
                    }
                }
                window.blur()
                window.hide()
                context = {tag: 'root', filterQuery: context.tag === 'root' ? context.filterQuery : ''}
                sendState()
                source.handlers.execute(item)
            } else {
                console.error(`[Store] No source for sourceId: ${item.sourceId}`)
            }
        })

        ipcMain.on(channels.navigate, (_, type: 'input', item: ListItem) => {
            if (type === 'input') {
                const source = sourceMap.get(item.sourceId)
                if (source && 'navigate' in source) {
                    if (context.tag === 'root') {
                        recordSelection(rankingContext, context.filterQuery, item.id)
                    }
                    context = {tag: 'input', parent: item, text: '', items: []}
                    selectedIndex = 0
                    sendState()
                } else {
                    console.log(`[Store] Source ${item.sourceId} doesn't support input navigation`)
                }
            }
        })

        ipcMain.on(channels.setInputText, (_, text: string) => {
            if (context.tag === 'input') {
                context = {...context, text}
                const source = sourceMap.get(context.parent.sourceId)
                if (source && 'navigate' in source) {
                    source.navigate.input({parent: context.parent, text}, (items) => {
                        if (context.tag === 'input') {
                            context = {...context, items}
                            sendState()
                        }
                    })
                }
                sendState()
            }
        })

        ipcMain.on(channels.back, () => {
            if (context.tag === 'input') {
                context = {tag: 'root', filterQuery: ''}
                selectedIndex = 0
                sendState()
            } else {
                window.blur()
                window.hide()
            }
        })

        ipcMain.on(channels.hideWindow, () => {
            window.blur()
            window.hide()
        })
    },
}
