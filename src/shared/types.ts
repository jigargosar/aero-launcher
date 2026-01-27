export type ListItem = {
    sourceId: string  // matches indexer.id
    id: string
    name: string
    icon: string  // base64 data URL
    metadata?: Record<string, string>
}

export type LauncherMode = 'launcher' | 'switcher'

export type LauncherState = {
    mode: LauncherMode
    items: ListItem[]
    selectedIndex: number
}

export const channels = {
    listItems: 'list-items',
    requestListItems: 'request-list-items',
    hideWindow: 'hide-window',
    setQuery: 'set-query',
    performPrimaryAction: 'perform-primary-action',
    // Launcher state (main → renderer)
    launcherState: 'launcher-state',
}

export type ElectronAPI = {
    onListItemsReceived: (callback: (items: ListItem[]) => void) => void
    requestListItems: () => void
    hideWindow: () => void
    setQuery: (query: string) => void
    performPrimaryAction: (item: ListItem) => void
    // Launcher state from main (null = reset to launcher mode)
    onLauncherState: (callback: (state: LauncherState | null) => void) => void
}

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        electron: ElectronAPI
    }
}
