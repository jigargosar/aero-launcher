// === Item Actions ===

export type ItemAction =
    | { type: 'execute' }
    | { type: 'input', placeholder: string }

// === List Item ===

export type ListItem = {
    sourceId: string  // matches indexer.id
    id: string
    name: string
    icon: string  // base64 data URL
    actions: ItemAction[]
    metadata?: Record<string, string>
}

// === List Mode (sent to renderer) ===

export type ListMode =
    | {
        tag: 'normal'
        items: ListItem[]
        selectedIndex: number
    }
    | {
        tag: 'input'
        item: ListItem
        text: string
        placeholder: string
        suggestions: ListItem[]
        selectedIndex: number
    }

// === IPC Channels ===

export const channels = {
    listMode: 'list-mode',
    requestListMode: 'request-list-mode',
    hideWindow: 'hide-window',
    setQuery: 'set-query',
    setSelectedIndex: 'set-selected-index',
    executeItem: 'execute-item',
    enterInputMode: 'enter-input-mode',
    setInputText: 'set-input-text',
    submitInput: 'submit-input',
    exitInputMode: 'exit-input-mode',
}

// === Electron API (exposed to renderer) ===

export type ElectronAPI = {
    onListMode: (callback: (mode: ListMode) => void) => void
    requestListMode: () => void
    hideWindow: () => void
    setQuery: (query: string) => void
    setSelectedIndex: (index: number) => void
    executeItem: (item: ListItem) => void
    enterInputMode: (item: ListItem) => void
    setInputText: (text: string) => void
    submitInput: () => void
    exitInputMode: () => void
}

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        electron: ElectronAPI
    }
}
