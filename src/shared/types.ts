export type ListItem = {
    id: string
    name: string
}

export const channels = {
    listState: 'list-state'
}

export type ElectronAPI = {
    onListState: (callback: (items: ListItem[]) => void) => void
}

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        electron: ElectronAPI
    }
}
