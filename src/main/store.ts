import { BrowserWindow, ipcMain } from 'electron'
import { channels, UIState, UIEvent, Frame, Item, Trigger, Provider, Response } from '@shared/types'

type State = { stack: Frame[] }
import { appProvider } from './providers/app-provider'
import { fsProvider } from './providers/fs-provider'
import { websearchProvider } from './providers/websearch-provider'

// === Provider Registry ===

const providers = new Map<string, Provider>()

function registerProvider(provider: Provider): void {
    providers.set(provider.id, provider)
}

function getRootItems(): Item[] {
    return [...providers.values()].flatMap(p => p.getRootItems())
}

async function handleTrigger(item: Item, trigger: Trigger): Promise<Response> {
    const provider = providers.get(item.moduleId)
    if (!provider) return { type: 'noop' }
    return provider.onTrigger(item, trigger)
}

// Register all providers
registerProvider(appProvider)
registerProvider(fsProvider)
registerProvider(websearchProvider)

// === Filtering ===

function filterItems(items: Item[], query: string): Item[] {
    if (!query) return items
    const lowerQuery = query.toLowerCase()
    return items.filter(item => item.name.toLowerCase().includes(lowerQuery))
}

// === Store ===

export const Store = {
    init(window: BrowserWindow): void {
        const rootItems = getRootItems()

        let state: State = {
            stack: [{
                tag: 'list',
                items: rootItems,
                query: '',
                selected: 0,
            }],
        }

        const currentFrame = (): Frame => state.stack[state.stack.length - 1]

        const buildUIState = (): UIState => currentFrame()

        const commit = () => {
            window.webContents.send(channels.state, buildUIState())
        }

        const updateFrame = (update: Partial<Frame>) => {
            const frame = currentFrame()
            state.stack[state.stack.length - 1] = { ...frame, ...update } as Frame
        }

        const pushFrame = (frame: Frame) => {
            state.stack.push(frame)
        }

        const popFrame = () => {
            if (state.stack.length > 1) {
                state.stack.pop()
            }
        }

        const resetToRoot = () => {
            state.stack = [{
                tag: 'list',
                items: rootItems,
                query: '',
                selected: 0,
            }]
        }

        const applyResponse = async (response: Response) => {
            switch (response.type) {
                case 'pushList': {
                    const frame = currentFrame()
                    const parent = frame.items[frame.selected]
                    pushFrame({
                        tag: 'list',
                        items: response.items,
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

        const handleEvent = async (event: UIEvent) => {
            const frame = currentFrame()

            switch (event.type) {
                case 'setInput': {
                    if (frame.tag === 'list') {
                        const filtered = filterItems(rootItems, event.value)
                        updateFrame({ query: event.value, items: filtered, selected: 0 })
                    } else if (frame.tag === 'input') {
                        updateFrame({ text: event.value })
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
                    const response = await handleTrigger(event.item, event.trigger)
                    await applyResponse(response)
                    break
                }

                case 'back': {
                    if (state.stack.length > 1) {
                        popFrame()
                    } else {
                        window.blur()
                        window.hide()
                    }
                    break
                }

                case 'reset': {
                    resetToRoot()
                    break
                }
            }

            commit()
        }

        ipcMain.on(channels.requestState, commit)
        ipcMain.on(channels.event, (_, event: UIEvent) => handleEvent(event))

        commit()
    },
}
