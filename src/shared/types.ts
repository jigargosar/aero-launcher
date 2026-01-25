export type ListItem = {
    id: string
    name: string
    icon: string  // base64 data URL
}

export const channels = {
    listItems: 'list-items',
    requestListItems: 'request-list-items',
    hideWindow: 'hide-window',
    setQuery: 'set-query',
}

export type ElectronAPI = {
    onListItemsReceived: (callback: (items: ListItem[]) => void) => void
    requestListItems: () => void
    hideWindow: () => void
    setQuery: (query: string) => void
}

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        electron: ElectronAPI
    }
}
