import { BrowserWindow, ipcMain } from 'electron'
import { channels, State, UIState, UIEvent, Frame, Item, Trigger } from '@shared/types'
import { handleTrigger, getRootItems } from './modules'
import { createRankingContext, filterAndSort, recordSelection, RankingContext } from './ranking'

// === Store ===

export const Store = {
    init(window: BrowserWindow): void {
        const rootItems = getRootItems()
        const ranking = createRankingContext()

        // Initial state - root frame with all items
        let state: State = {
            stack: [{
                tag: 'list',
                items: filterAndSort(rootItems, '', ranking),
                allItems: rootItems,
                query: '',
                selected: 0,
            }],
        }

        // Get current frame (top of stack)
        const currentFrame = (): Frame => state.stack[state.stack.length - 1]

        // Build UI state from current frame
        const buildUIState = (): UIState => currentFrame()

        // Commit state to renderer
        const commit = () => {
            window.webContents.send(channels.state, buildUIState())
        }

        // Update current frame
        const updateFrame = (update: Partial<Frame>) => {
            const frame = currentFrame()
            state.stack[state.stack.length - 1] = { ...frame, ...update } as Frame
        }

        // Push new frame
        const pushFrame = (frame: Frame) => {
            state.stack.push(frame)
        }

        // Pop frame (back)
        const popFrame = () => {
            if (state.stack.length > 1) {
                state.stack.pop()
            }
        }

        // Reset to root
        const resetToRoot = () => {
            state.stack = [{
                tag: 'list',
                items: filterAndSort(rootItems, '', ranking),
                allItems: rootItems,
                query: '',
                selected: 0,
            }]
        }

        // Handle trigger response
        const applyResponse = async (response: Awaited<ReturnType<typeof handleTrigger>>) => {
            switch (response.type) {
                case 'pushList': {
                    const frame = currentFrame()
                    const parent = frame.items[frame.selected]
                    pushFrame({
                        tag: 'list',
                        items: response.items,
                        allItems: response.items,
                        query: '',
                        selected: 0,
                        parent,
                    })
                    break
                }
                case 'pushInput': {
                    const frame = currentFrame()
                    const parent = frame.items[frame.selected]
                    pushFrame({
                        tag: 'input',
                        items: [],
                        text: '',
                        selected: 0,
                        parent,
                        placeholder: response.placeholder,
                    })
                    break
                }
                case 'updateItems': {
                    updateFrame({ items: response.items, selected: 0 })
                    break
                }
                case 'pop': {
                    popFrame()
                    break
                }
                case 'reset': {
                    resetToRoot()
                    break
                }
                case 'hide': {
                    window.blur()
                    window.hide()
                    resetToRoot()
                    break
                }
                case 'noop':
                    break
            }
        }

        // === Event Handlers ===

        const handleEvent = async (event: UIEvent) => {
            const frame = currentFrame()

            switch (event.type) {
                case 'setInput': {
                    if (frame.tag === 'list') {
                        // Filter from allItems with ranking
                        const filtered = filterAndSort(frame.allItems, event.value, ranking)
                        updateFrame({ query: event.value, items: filtered, selected: 0 })
                    } else if (frame.tag === 'input') {
                        updateFrame({ text: event.value })
                        // Trigger textChange on parent
                        const response = await handleTrigger(frame.parent, { type: 'textChange', text: event.value })
                        await applyResponse(response)
                    }
                    break
                }

                case 'setSelected': {
                    updateFrame({ selected: event.index })
                    break
                }

                case 'trigger': {
                    // Record selection for ranking when executing from root
                    if (event.trigger.type === 'execute' && frame.tag === 'list' && !frame.parent) {
                        recordSelection(ranking, frame.query, event.item.id)
                    }
                    const response = await handleTrigger(event.item, event.trigger)
                    await applyResponse(response)
                    break
                }

                case 'back': {
                    if (state.stack.length > 1) {
                        popFrame()
                    }
                    // At root - do nothing (can't go back further)
                    break
                }

                case 'reset': {
                    if (state.stack.length === 1 && currentFrame().tag === 'list' && !(currentFrame() as any).parent) {
                        // Already at root - hide
                        window.blur()
                        window.hide()
                    } else {
                        resetToRoot()
                    }
                    break
                }
            }

            commit()
        }

        // === IPC Handlers ===

        ipcMain.on(channels.requestState, commit)
        ipcMain.on(channels.event, (_, event: UIEvent) => handleEvent(event))

        // Initial commit
        commit()
    },
}
