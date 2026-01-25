export type ListItem = {
    id: string
    name: string
}

export const channels = {
    listItems: 'list-items',
    requestListItems: 'request-list-items',
}

export type ElectronAPI = {
    onListItemsReceived: (callback: (items: ListItem[]) => void) => void
    requestListItems: () => void
}

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        electron: ElectronAPI
    }
}
