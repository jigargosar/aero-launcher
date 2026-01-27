// === List Item ===

export type ListItem = {
    id: string
    name: string
    icon: string
    sourceId: string
    metadata?: Record<string, string>
}

// === Navigation Context ===

export type InputContext = {
    parent: ListItem
    text: string
}

// === Emit Function ===

export type EmitFn = (items: ListItem[]) => void

// === Sources (ISI - each source type fully specified) ===

export type AppsSource = {
    id: 'apps'
    onStart: (emit: EmitFn) => void
    handlers: {
        execute: (item: ListItem) => void
    }
}

export type WebSearchSource = {
    id: 'websearch'
    onStart: (emit: EmitFn) => void
    navigate: {
        input: (context: InputContext, emit: EmitFn) => void
    }
    handlers: {
        execute: (item: ListItem) => void
    }
}

export type Source = AppsSource | WebSearchSource

// === UI State (sent to renderer) ===

export type UIState =
    | {
        tag: 'root'
        items: ListItem[]
        selectedIndex: number
        filterQuery: string
    }
    | {
        tag: 'input'
        parent: ListItem
        placeholder: string
        text: string
        items: ListItem[]
        selectedIndex: number
    }

// === IPC Channels ===

export const channels = {
    // Main → Renderer
    state: 'state',

    // Renderer → Main
    requestState: 'request-state',
    navigate: 'navigate',
    back: 'back',
    execute: 'execute',
    setFilterQuery: 'set-filter-query',
    setInputText: 'set-input-text',
    setSelectedIndex: 'set-selected-index',
    hideWindow: 'hide-window',
}

// === Electron API (exposed to renderer) ===

export type ElectronAPI = {
    onState: (callback: (state: UIState) => void) => void
    requestState: () => void
    navigate: (type: 'input', item: ListItem) => void  // Only input for now
    back: () => void
    execute: (item: ListItem) => void
    setFilterQuery: (query: string) => void
    setInputText: (text: string) => void
    setSelectedIndex: (index: number) => void
    hideWindow: () => void
}

declare global {
    interface Window {
        electron: ElectronAPI
    }
}
