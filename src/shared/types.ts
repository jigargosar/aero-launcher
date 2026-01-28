// === List Item ===

export type ListItem = {
    sourceId: string
    id: string
    name: string
    icon: string
    metadata?: Record<string, string>
}

// === Sources ===

type BaseSource = {
    id: string
    getItems: (query: string) => ListItem[]
    execute: (item: ListItem) => void
}

export type SimpleSource = BaseSource & {
    type: 'simple'
}

export type InputableSource = BaseSource & {
    type: 'inputable'
    getInputItems: (parent: ListItem, text: string, emit: (items: ListItem[]) => void) => void
}

export type BrowsableSource = BaseSource & {
    type: 'browsable'
    getChildren: (item: ListItem) => ListItem[]
}

export type Source = SimpleSource | InputableSource | BrowsableSource

// === State ===

export type State =
    | {tag: 'root'; query: string}
    | {tag: 'input'; source: InputableSource; parent: ListItem; text: string; items: ListItem[]}
    | {tag: 'browse'; source: BrowsableSource; path: ListItem[]}

// === IPC ===

export const channels = {
    state: 'state',
    requestState: 'request-state',
    setQuery: 'set-query',
    execute: 'execute',
    navigate: 'navigate',
    setInputText: 'set-input-text',
    back: 'back',
    hideWindow: 'hide-window',
}

// === UI State (sent to renderer) ===

export type UIState =
    | {tag: 'root'; items: ListItem[]; query: string}
    | {tag: 'input'; parent: ListItem; text: string; items: ListItem[]; placeholder: string}
    | {tag: 'browse'; path: ListItem[]; items: ListItem[]}

// === Electron API ===

export type ElectronAPI = {
    onState: (callback: (state: UIState) => void) => void
    requestState: () => void
    setQuery: (query: string) => void
    execute: (item: ListItem) => void
    navigate: (item: ListItem) => void
    setInputText: (text: string) => void
    back: () => void
    hideWindow: () => void
}

declare global {
    interface Window {
        electron: ElectronAPI
    }
}
