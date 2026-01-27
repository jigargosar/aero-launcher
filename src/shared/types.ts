export type ListItem = {
    sourceId: string  // matches indexer.id
    id: string
    name: string
    icon: string  // base64 data URL
    metadata?: Record<string, string>
}

export type ListState = {
    items: ListItem[]
    selectedIndex: number
}

export const channels = {
    listState: 'list-state',
    requestListState: 'request-list-state',
    hideWindow: 'hide-window',
    setQuery: 'set-query',
    setSelectedIndex: 'set-selected-index',
    performPrimaryAction: 'perform-primary-action',
}

export type ElectronAPI = {
    onListState: (callback: (state: ListState) => void) => void
    requestListState: () => void
    hideWindow: () => void
    setQuery: (query: string) => void
    setSelectedIndex: (index: number) => void
    performPrimaryAction: (item: ListItem) => void
}

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        electron: ElectronAPI
    }
}
