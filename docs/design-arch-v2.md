# Launch Bar Architecture v2

## Overview

A provider-based architecture with message passing, breadcrumb navigation, and unified ListItem model.

## Core Types

### ListItem

Single type, no discriminated union. Provider interprets `meta` as needed.

```typescript
type Action = 'primary' | 'secondary' | 'nav' | 'input'

type ListItem = {
  key: string
  name: string
  icon: string
  provider: string
  typeLabel: string
  subtypeLabel?: string
  meta: Record<string, string>
  actions: Action[]
}
```

**Actions:**
- `primary` - Enter: execute main action
- `secondary` - Shift+Enter: execute alternative action
- `nav` - Tab: drill into item, show children
- `input` - Space: enter input mode for this item

### Messages

```typescript
type InMessage =
  | { type: 'activate'; context: ListItem[] }
  | { type: 'action'; item: ListItem; action: Action; input?: string }

type OutMessage =
  | { type: 'items'; items: ListItem[] }
```

### Provider

Factory pattern. Instance holds internal state. Receives messages, sends items.

```typescript
type Provider = {
  name: string
  receive: (msg: InMessage) => void
}

type ProviderFactory = (send: (msg: OutMessage) => void) => Provider
```

### Store

```typescript
type BreadcrumbEntry = {
  item: ListItem
  query: string
}

type Store = {
  breadcrumb: BreadcrumbEntry[]
  query: string
  items: ListItem[]
  providers: Map<string, Provider>
}
```

## Store Behavior

### Activation

```typescript
function activate(store: Store): void {
  const context = store.breadcrumb.map(e => e.item)

  if (context.length === 0) {
    // Root: activate all providers
    store.providers.forEach(p => p.receive({ type: 'activate', context: [] }))
  } else {
    // Nested: activate only the provider that owns current context
    const provider = store.providers.get(context.at(-1).provider)
    provider?.receive({ type: 'activate', context })
  }
}
```

### Navigation

```typescript
function navInto(store: Store, item: ListItem): void {
  store.breadcrumb.push({ item, query: store.query })
  store.query = ''
  store.items = []
  activate(store)
}

function navBack(store: Store): void {
  const entry = store.breadcrumb.pop()
  if (entry) {
    store.query = entry.query
  }
  store.items = []
  activate(store)
}
```

### Action Execution

```typescript
function executeAction(store: Store, item: ListItem, action: Action, input?: string): void {
  const provider = store.providers.get(item.provider)
  provider?.receive({ type: 'action', item, action, input })
}
```

### Item Updates

When provider sends `{ type: 'items', items }`:
- Replace mode: `store.items = items`
- At root: merge items from all providers
- Nested: single provider's items only

## UI State (Renderer)

Input mode is UI state, not store state:

```typescript
const [inputMode, setInputMode] = useState<{
  item: ListItem
  value: string
} | null>(null)
```

Store only tracks: breadcrumb, query, items.

## Provider Implementation

### Factory Pattern

```typescript
function createProvider(send: (msg: OutMessage) => void): Provider {
  // Internal state
  const state = { ... }

  return {
    name: 'provider-name',
    receive(msg) {
      switch (msg.type) {
        case 'activate':
          // Determine what items to send based on context
          send({ type: 'items', items: [...] })
          break
        case 'action':
          // Handle action
          break
      }
    }
  }
}
```

### WebSearch Example

```typescript
function createWebSearchProvider(send: (msg: OutMessage) => void): Provider {
  const history: string[] = []

  const searchItems: ListItem[] = [
    {
      key: 'ws:google',
      name: 'Google Search',
      icon: SEARCH_ICON,
      provider: 'websearch',
      typeLabel: 'Command',
      subtypeLabel: 'Web Search',
      meta: { url: 'https://google.com/search?q=' },
      actions: ['primary', 'input', 'nav']
    },
    {
      key: 'ws:youtube',
      name: 'YouTube Search',
      icon: SEARCH_ICON,
      provider: 'websearch',
      typeLabel: 'Command',
      subtypeLabel: 'Web Search',
      meta: { url: 'https://youtube.com/results?q=' },
      actions: ['primary', 'input', 'nav']
    }
  ]

  return {
    name: 'websearch',
    receive(msg) {
      switch (msg.type) {
        case 'activate':
          if (msg.context.length === 0) {
            // Root level: send search engine items
            send({ type: 'items', items: searchItems })
          } else {
            // Inside a search item: send history
            const parent = msg.context.at(-1)!
            const historyItems: ListItem[] = history.map(q => ({
              key: `ws:history:${q}`,
              name: q,
              icon: SEARCH_ICON,
              provider: 'websearch',
              typeLabel: 'Command',
              subtypeLabel: 'Recent',
              meta: { query: q, url: parent.meta.url },
              actions: ['primary']
            }))
            send({ type: 'items', items: historyItems })
          }
          break

        case 'action':
          if (msg.action === 'primary') {
            const query = msg.input || msg.item.meta.query
            const url = msg.item.meta.url + encodeURIComponent(query)
            if (msg.input) {
              history.unshift(msg.input)
            }
            shell.openExternal(url)
          }
          break
      }
    }
  }
}
```

## User Flows

### Root Level Search

```
[App starts]
breadcrumb = []
query = ''
→ activate all providers
→ providers send items
→ items = [Google, YouTube, Apps, Settings, ...]

[User types 'go']
query = 'go'
→ filter items by query
→ UI shows: Google Search

[User presses Enter]
→ executeAction(Google, 'primary')
→ provider handles (opens google.com)
```

### Input Mode (Space)

```
[User presses Space on Google Search]
→ UI enters input mode (item has 'input' action)
→ inputMode = { item: Google, value: '' }

[User types 'cats']
→ inputMode.value = 'cats'

[User presses Enter]
→ executeAction(Google, 'primary', 'cats')
→ provider opens google.com/search?q=cats
→ provider saves 'cats' to history
→ UI exits input mode
```

### Navigation (Tab)

```
[User presses Tab on Google Search]
→ navInto(Google)
→ breadcrumb = [{ item: Google, query: 'go' }]
→ query = ''
→ activate websearch provider with context=[Google]
→ provider sends history items
→ items = [cats, dogs, ...]

[User types 'ca']
→ query = 'ca'
→ filter items
→ UI shows: cats

[User presses Escape]
→ navBack()
→ breadcrumb = []
→ query = 'go' (restored)
→ activate all providers
→ back to root
```

## Configuration

### Collapsed vs Flattened Providers

```typescript
type StoreConfig = {
  collapsed: string[]   // Show single entry, expand on Tab
  flattened: string[]   // Show all items at root
}
```

For collapsed providers, store generates entry item. On Tab, activates provider for full list.

## Registration

```typescript
// Store setup
const store = createStore()

// Create and register providers
const websearch = createWebSearchProvider(msg => handleProviderMessage(store, 'websearch', msg))
store.providers.set('websearch', websearch)

const apps = createAppsProvider(msg => handleProviderMessage(store, 'apps', msg))
store.providers.set('apps', apps)

// Initial activation
activate(store)
```

## Migration Path

1. Implement new store alongside existing
2. Create new providers using factory pattern
3. Bridge old ListItem types to new format
4. Migrate renderer to handle new format
5. Remove old code once stable

---

## Review: Current Implementation vs V2 Design

### Answered by current implementation:

| Question | Answer in Current Code |
|----------|------------------------|
| Display labels | `ListItem.typeLabel()` switches on `item.type`, `item.subcategory` exists |
| Filtering | Store does it via `filterAndSort()` in `store.ts:38` |
| Root merging | Map by key (upsert), then filter/sort |
| Learned/history | Store tracks `learned: Map<string, string>`, `history: string[]` |

### Decisions pending (not in current impl or v2 design):

| Question | Status |
|----------|--------|
| Display labels in v2 | No `item.type` in v2 → where does "Command" label come from? Store meta? Provider sets it? |
| Suggestions flow | `autocompleteUrl` exists but not wired. Need `{ type: 'input', value }` message? |
| Item removal | Current only upserts. Need remove? Or replace mode covers it? |
| Input-reactive providers | Current `setQuery` just filters. V2 needs input to reach provider. |
| Collapsed entry items | Who creates "Apps" entry? Store or provider? |
| Provider persistence | Current is in-memory. Lowdb later? Interface? |

### Key decision needed:

V2 removes discriminated union (`type: 'app' | 'command' | 'settings'`), but current UI relies on it for `typeLabel`. Options:

1. Add `typeLabel` to ListItem directly ✓ (chosen)
2. Derive from `provider` name
3. Store in `meta`
