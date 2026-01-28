import {BrowserWindow, ipcMain} from 'electron'
import {channels, State, UIState, ListItem, Source, InputableSource, BrowsableSource} from '@shared/types'
import {appsSource} from './sources/apps-source'
import {websearchSource} from './sources/websearch-source'
import {calculatorSource} from './sources/calculator-source'
import {filesSource} from './sources/files-source'
import {clipboardSource} from './sources/clipboard-source'
import {createRankingContext, filterAndSort, recordSelection} from './ranking'

// === Sources ===

const sources: Source[] = [
    appsSource,
    websearchSource,
    calculatorSource,
    filesSource,
    clipboardSource,
]

// === Store ===

export const Store = {
    init(window: BrowserWindow): void {
        let state: State = {tag: 'root', query: ''}
        const ranking = createRankingContext()

        // Get items for current state
        const getItems = (): ListItem[] => {
            switch (state.tag) {
                case 'root': {
                    const query = state.query
                    const allItems = sources.flatMap(s => s.getItems(query))
                    return filterAndSort(allItems, query, ranking)
                }
                case 'input':
                    return state.items
                case 'browse':
                    return state.source.getChildren(state.path[state.path.length - 1])
            }
        }

        // Build UI state
        const buildUIState = (): UIState => {
            switch (state.tag) {
                case 'root':
                    return {tag: 'root', items: getItems(), query: state.query}
                case 'input':
                    return {
                        tag: 'input',
                        parent: state.parent,
                        text: state.text,
                        items: state.items,
                        placeholder: state.parent.metadata?.placeholder ?? 'Type...',
                    }
                case 'browse':
                    return {tag: 'browse', path: state.path, items: getItems()}
            }
        }

        // Commit state to renderer
        const commit = () => {
            window.webContents.send(channels.state, buildUIState())
        }

        // Find source by id
        const findSource = (id: string): Source | undefined =>
            sources.find(s => s.id === id)

        // === IPC Handlers ===

        ipcMain.on(channels.requestState, commit)

        ipcMain.on(channels.setQuery, (_, query: string) => {
            if (state.tag === 'root') {
                state = {tag: 'root', query}
                commit()
            }
        })

        ipcMain.on(channels.execute, (_, item: ListItem) => {
            const source = findSource(item.sourceId)
            if (!source) return

            if (state.tag === 'root') {
                recordSelection(ranking, state.query, item.id)
            }

            window.blur()
            window.hide()
            source.execute(item)

            // Reset to root
            state = {tag: 'root', query: ''}
            commit()
        })

        ipcMain.on(channels.navigate, (_, item: ListItem) => {
            const source = findSource(item.sourceId)
            if (!source) return

            if (state.tag === 'root') {
                recordSelection(ranking, state.query, item.id)
            }

            // Check source type and navigate accordingly
            if (source.type === 'inputable') {
                state = {tag: 'input', source, parent: item, text: '', items: []}
                commit()
            } else if (source.type === 'browsable') {
                const isFolder = item.metadata?.isFolder === 'true'
                if (isFolder) {
                    if (state.tag === 'browse') {
                        state = {tag: 'browse', source, path: [...state.path, item]}
                    } else {
                        state = {tag: 'browse', source, path: [item]}
                    }
                    commit()
                }
            }
        })

        ipcMain.on(channels.setInputText, (_, text: string) => {
            if (state.tag === 'input') {
                state = {...state, text}
                commit()
                state.source.getInputItems(state.parent, text, (items) => {
                    if (state.tag === 'input') {
                        state = {...state, items}
                        commit()
                    }
                })
            }
        })

        ipcMain.on(channels.back, () => {
            switch (state.tag) {
                case 'root':
                    window.blur()
                    window.hide()
                    break
                case 'input':
                    state = {tag: 'root', query: ''}
                    commit()
                    break
                case 'browse':
                    if (state.path.length > 1) {
                        state = {...state, path: state.path.slice(0, -1)}
                    } else {
                        state = {tag: 'root', query: ''}
                    }
                    commit()
                    break
            }
        })

        ipcMain.on(channels.hideWindow, () => {
            window.blur()
            window.hide()
        })

        // Initial commit
        commit()
    }
}
