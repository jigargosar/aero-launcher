// V2 Architecture Types

export type Action = 'primary' | 'secondary' | 'nav' | 'input'

export type ListItem = {
  key: string
  name: string
  icon: string
  provider: string
  typeLabel: string
  subtypeLabel?: string
  meta: Record<string, string>
  actions: Action[]
}

export type InMessage =
  | { type: 'activate'; context: ListItem[] }
  | { type: 'action'; item: ListItem; action: Action; input?: string }

export type OutMessage = { type: 'items'; items: ListItem[] }

export type Provider = {
  name: string
  receive: (msg: InMessage) => void
}

export type ProviderFactory = (send: (msg: OutMessage) => void) => Provider

export type BreadcrumbEntry = {
  item: ListItem
  query: string
}

export const channels = {
  listState: 'list-state',
  requestListState: 'request-list-state'
} as const

export type ElectronAPI = {
  onListState: (callback: (items: ListItem[]) => void) => void
  requestListState: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
