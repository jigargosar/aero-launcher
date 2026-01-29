import { BrowserWindow, ipcMain } from 'electron'
import { channels, UIEvent, Frame, Item, Trigger, Provider, Response } from '@shared/types'
import { appProvider } from './providers/app-provider'
import { fsProvider } from './providers/fs-provider'
import { websearchProvider } from './providers/websearch-provider'
import { Ranking } from './ranking'

// === Providers ===

type Providers = {
    registry: Map<string, Provider>
}

const Providers = {
    init: (): Providers => {
        const list = [appProvider, fsProvider, websearchProvider]
        return { registry: new Map(list.map(p => [p.id, p])) }
    },

    getRootItems: (p: Providers): Item[] =>
        [...p.registry.values()].flatMap(pr => pr.getRootItems()),

    handleTrigger: async (p: Providers, item: Item, trigger: Trigger): Promise<Response> => {
        const provider = p.registry.get(item.moduleId)
        if (!provider) {
            console.error(`Provider not found: ${item.moduleId}`)
            return { type: 'noop' }
        }
        return provider.onTrigger(item, trigger)
    },
}

// === State ===

type State = {
    stack: Frame[]
    ranking: Ranking
    rootItems: Item[]
}

const State = {
    create: (rootItems: Item[]): State => {
        const ranking = Ranking.create()
        return {
            stack: [{
                tag: 'list',
                items: Ranking.filterAndSort(ranking, rootItems, ''),
                query: '',
                selected: 0,
            }],
            ranking,
            rootItems,
        }
    },

    currentFrame: (s: State): Frame => s.stack[s.stack.length - 1],

    isAtRoot: (s: State): boolean => s.stack.length === 1,

    setQuery: (s: State, query: string): State => {
        const frame = State.currentFrame(s)
        if (frame.tag !== 'list') {
            console.error('setQuery requires list frame')
            return s
        }
        const filtered = Ranking.filterAndSort(s.ranking, s.rootItems, query)
        const newFrame = { ...frame, query, items: filtered, selected: 0 }
        return { ...s, stack: [...s.stack.slice(0, -1), newFrame] }
    },

    setInputText: (s: State, text: string): State => {
        const frame = State.currentFrame(s)
        if (frame.tag !== 'input') {
            console.error('setInputText requires input frame')
            return s
        }
        const newFrame = { ...frame, text }
        return { ...s, stack: [...s.stack.slice(0, -1), newFrame] }
    },

    setSelected: (s: State, index: number): State => {
        const frame = State.currentFrame(s)
        const newFrame = { ...frame, selected: index }
        return { ...s, stack: [...s.stack.slice(0, -1), newFrame] }
    },

    pushList: (s: State, items: Item[]): State => {
        const frame = State.currentFrame(s)
        const parent = frame.items[frame.selected]
        const newFrame: Frame = {
            tag: 'list',
            items,
            query: '',
            selected: 0,
            parent,
        }
        return { ...s, stack: [...s.stack, newFrame] }
    },

    pushInput: (s: State, placeholder: string): State => {
        const frame = State.currentFrame(s)
        const parent = frame.items[frame.selected]
        const newFrame: Frame = {
            tag: 'input',
            items: [],
            text: '',
            selected: 0,
            parent,
            placeholder,
        }
        return { ...s, stack: [...s.stack, newFrame] }
    },

    pop: (s: State): State => {
        if (s.stack.length <= 1) {
            console.error('Cannot pop root frame')
            return s
        }
        return { ...s, stack: s.stack.slice(0, -1) }
    },

    reset: (s: State): State => ({
        ...s,
        stack: [{
            tag: 'list',
            items: Ranking.filterAndSort(s.ranking, s.rootItems, ''),
            query: '',
            selected: 0,
        }],
    }),

    updateItems: (s: State, items: Item[]): State => {
        const frame = State.currentFrame(s)
        const newFrame = { ...frame, items, selected: 0 }
        return { ...s, stack: [...s.stack.slice(0, -1), newFrame] }
    },

    recordSelection: (s: State, itemId: string): void => {
        const frame = State.currentFrame(s)
        if (frame.tag === 'list') {
            Ranking.recordSelection(s.ranking, frame.query, itemId)
        }
    },
}

// === Store ===

export const Store = {
    init(window: BrowserWindow): void {
        const providers = Providers.init()
        let state = State.create(Providers.getRootItems(providers))

        const commit = () => {
            window.webContents.send(channels.state, State.currentFrame(state))
        }

        const applyResponse = (response: Response) => {
            switch (response.type) {
                case 'pushList':    state = State.pushList(state, response.items); break
                case 'pushInput':   state = State.pushInput(state, response.placeholder); break
                case 'updateItems': state = State.updateItems(state, response.items); break
                case 'pop':         state = State.pop(state); break
                case 'reset':       state = State.reset(state); break
                case 'hide':
                    window.blur()
                    window.hide()
                    state = State.reset(state)
                    break
                case 'noop':
                    break
            }
        }

        const handleEvent = async (event: UIEvent) => {
            const frame = State.currentFrame(state)

            switch (event.type) {
                case 'setQuery':
                    if (frame.tag !== 'list') {
                        console.error('setQuery requires list frame')
                        return
                    }
                    state = State.setQuery(state, event.query)
                    break

                case 'setInputText': {
                    if (frame.tag !== 'input') {
                        console.error('setInputText requires input frame')
                        return
                    }
                    state = State.setInputText(state, event.text)
                    const response = await Providers.handleTrigger(providers, frame.parent, { type: 'textChange', text: event.text })
                    const curr = State.currentFrame(state)
                    if (curr.tag === 'input' && curr.text === event.text) {
                        applyResponse(response)
                    }
                    break
                }

                case 'setSelected':
                    state = State.setSelected(state, event.index)
                    break

                case 'trigger': {
                    const recordable = ['execute', 'browse', 'sendTo', 'actionMenu', 'secondary']
                    if (recordable.includes(event.trigger.type)) {
                        State.recordSelection(state, event.item.id)
                    }
                    const response = await Providers.handleTrigger(providers, event.item, event.trigger)
                    applyResponse(response)
                    break
                }

                case 'back':
                    if (State.isAtRoot(state)) {
                        window.blur()
                        window.hide()
                    } else {
                        state = State.pop(state)
                    }
                    break

                case 'reset':
                    state = State.reset(state)
                    break
            }

            commit()
        }

        ipcMain.on(channels.requestState, commit)
        ipcMain.on(channels.event, (_, event: UIEvent) => handleEvent(event))

        commit()
    },
}
