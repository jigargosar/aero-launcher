// === Core Types ===

export type TriggerType = Trigger['type']

export type Item = {
    id: string
    name: string
    icon: string
    moduleId: string
    metadata: Record<string, unknown>
    triggers: TriggerType[]
}

export type Trigger =
    | { type: 'execute' }
    | { type: 'browse' }
    | { type: 'sendTo' }
    | { type: 'actionMenu' }
    | { type: 'secondary' }
    | { type: 'textChange'; text: string }

export type Response =
    | { type: 'pushList'; items: Item[] }
    | { type: 'pushInput'; placeholder: string }
    | { type: 'updateItems'; items: Item[] }
    | { type: 'pop' }
    | { type: 'reset' }
    | { type: 'hide' }
    | { type: 'noop' }

export type Provider = {
    id: string
    getRootItems: () => Item[]
    onTrigger: (item: Item, trigger: Trigger) => Promise<Response>
}

// === State ===

export type Frame =
    | { tag: 'list'; sourceItems: Item[]; filteredSourceItems: Item[]; query: string; selected: number; parent?: Item }
    | { tag: 'input'; items: Item[]; text: string; selected: number; parent: Item; placeholder: string }

// === IPC ===

export type UIState = Frame

export type UIEvent =
    | { type: 'setQuery'; query: string }
    | { type: 'setInputText'; text: string }
    | { type: 'setSelected'; index: number }
    | { type: 'trigger'; item: Item; trigger: Trigger }
    | { type: 'back' }
    | { type: 'reset' }

export const channels = {
    state: 'state',
    event: 'event',
    requestState: 'request-state',
}

// === Electron API ===

export type ElectronAPI = {
    onState: (callback: (state: UIState) => void) => void
    sendEvent: (event: UIEvent) => void
    requestState: () => void
}

declare global {
    interface Window {
        electron: ElectronAPI
    }
}
