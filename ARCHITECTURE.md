# Launch Bar v2 - Architecture

## Core Concepts

### 1. Items
Simple data objects. No behavior, no optional fields.

```ts
type ListItem = {
    id: string          // Unique across all items
    name: string        // Display name
    icon: string        // Icon URL or data URI
    sourceId: string    // Which source owns this item
    metadata?: Record<string, string>  // Source-specific data
}
```

### 2. Sources
Provide items and handle actions. Two types:

- **Root sources**: Emit items at startup (apps, websearch entries)
- **Child sources**: Emit items when navigated into (suggestions, folder contents)

### 3. Navigation Types

| Type | Trigger | Purpose | Example |
|------|---------|---------|---------|
| `browse` | Right Arrow | Show children/contents | Folder → files |
| `input` | Space | Text input, fetch dynamic items | Search → suggestions |
| `sendTo` | Tab | Pick target destination | File → folder to copy to |
| `actionMenu` | Ctrl+Right Arrow | Show available actions | File → copy/delete/reveal |

### 4. Context Stack
Navigation is a stack. Push when navigating in, pop when going back.

```
[root]
[root] → [browse, parent: Documents]
[root] → [browse, parent: Documents] → [input, parent: Google Search, text: "weather"]
```

---

## Types

### ActionType
```ts
type ActionType = 'execute' | 'preview' | 'reveal' | 'copy' | 'delete'
// Extensible - add more as needed
```

### NavigationType
```ts
type NavigationType = 'browse' | 'input' | 'sendTo' | 'actionMenu'
```

### Context (ISI - Discriminated Union)
```ts
type StoreContext =
    | { tag: 'root', filterQuery: string }
    | { tag: 'browse', parent: ListItem, filterQuery: string }
    | { tag: 'input', parent: ListItem, text: string }
    | { tag: 'sendTo', parent: ListItem, filterQuery: string }
    | { tag: 'actionMenu', parent: ListItem, filterQuery: string }
```

### UI State (sent to renderer)
```ts
type UIState =
    | {
        tag: 'root'
        items: ListItem[]
        selectedIndex: number
        filterQuery: string
      }
    | {
        tag: 'browse'
        parent: ListItem
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
    | {
        tag: 'sendTo'
        parent: ListItem
        items: ListItem[]
        selectedIndex: number
        filterQuery: string
      }
    | {
        tag: 'actionMenu'
        parent: ListItem
        items: ListItem[]
        selectedIndex: number
        filterQuery: string
      }
```

---

## Source Registration

### Root Source
```ts
type RootSource = {
    id: string

    // Called at startup, emit indexed items
    onStart: (emit: (items: ListItem[]) => void) => void

    // Navigation handlers (optional - only what source supports)
    navigate?: {
        browse?: NavigateHandler
        input?: InputNavigateHandler
        sendTo?: NavigateHandler
        actionMenu?: NavigateHandler
    }

    // Action handlers
    handlers: Partial<Record<ActionType, (item: ListItem) => void>>
}

type NavigateHandler = (
    context: { parent: ListItem, filterQuery: string },
    emit: (items: ListItem[]) => void
) => void

type InputNavigateHandler = (
    context: { parent: ListItem, text: string },
    emit: (items: ListItem[]) => void
) => void
```

### Child Source
```ts
type ChildSource = {
    id: string

    // Type of navigation this source handles
    type: 'browse' | 'input' | 'sendTo' | 'actionMenu'

    // Called when navigating into an item
    onActivate: NavigateHandler | InputNavigateHandler

    // Placeholder for input type
    placeholder?: string  // Required if type === 'input'

    // Action handlers
    handlers: Partial<Record<ActionType, (item: ListItem) => void>>
}
```

### Registration API
```ts
// Store API
interface StoreAPI {
    registerRootSource(source: RootSource): void
    registerChildSource(source: ChildSource): void
}
```

---

## Store State

```ts
type Store = {
    // Context stack (current = last element)
    contextStack: StoreContext[]

    // Current items (from active source)
    items: ListItem[]

    // Selection
    selectedIndex: number

    // Registered sources
    rootSources: Map<string, RootSource>
    childSources: Map<string, ChildSource>
}
```

---

## IPC Channels

### Renderer → Main

```ts
type ElectronAPI = {
    // Request current state
    requestState: () => void

    // Navigation
    navigate: (type: NavigationType, item: ListItem) => void
    back: () => void

    // Input
    setInputText: (text: string) => void
    setFilterQuery: (query: string) => void

    // Actions
    execute: (item: ListItem) => void

    // Selection
    setSelectedIndex: (index: number) => void

    // Window
    hideWindow: () => void
}
```

### Main → Renderer

```ts
type MainEvents = {
    // State update
    onState: (callback: (state: UIState) => void) => void
}
```

---

## Flows

### Startup Flow
```
1. Store initializes
2. For each root source:
   - Call source.onStart(emit)
   - Source emits items
   - Store collects in rootItems map
3. Context = { tag: 'root', filterQuery: '' }
4. Send UIState to renderer
```

### Normal Mode - Filter Flow
```
1. User types "goo"
2. Renderer: setFilterQuery("goo")
3. Store: context.filterQuery = "goo"
4. Store: filters items locally
5. Store: sends UIState with filtered items
```

### Navigate - Browse Flow (Right Arrow)
```
1. User presses Right Arrow on "Documents" folder
2. Renderer: navigate('browse', documentsItem)
3. Store:
   - Gets source for item.sourceId
   - Checks source.navigate.browse exists
   - Creates context: { tag: 'browse', parent: item, filterQuery: '' }
   - Pushes to contextStack
   - Calls source.navigate.browse(context, emit)
4. Source: emits children items
5. Store: sends UIState
```

### Navigate - Input Flow (Space)
```
1. User presses Space on "Google Search"
2. Renderer: navigate('input', googleItem)
3. Store:
   - Gets source for item.sourceId
   - Checks source.navigate.input exists
   - Creates context: { tag: 'input', parent: item, text: '' }
   - Pushes to contextStack
   - Calls source.navigate.input(context, emit)
4. Source: emits [] (no text yet)
5. Store: sends UIState with placeholder

6. User types "weather"
7. Renderer: setInputText("weather")
8. Store:
   - Updates context.text = "weather"
   - Calls source.navigate.input(context, emit)
9. Source: fetches suggestions, emits items
10. Store: sends UIState with suggestions
```

### Navigate - Back Flow (Left Arrow / Escape)
```
1. User presses Left Arrow or Escape
2. Renderer: back()
3. Store:
   - Pops contextStack
   - If at root: hide window (on Escape) or no-op (on Left)
   - Else: restore previous context
4. Store: sends UIState
```

### Execute Flow (Enter)
```
1. User presses Enter on selected item
2. Renderer: execute(selectedItem)
3. Store:
   - Gets source for item.sourceId
   - Calls source.handlers.execute(item)
4. Source: performs action (open file, search, etc.)
5. Store: optionally hides window
```

---

## Example: WebSearch Source

```ts
const PROVIDERS: Record<string, { name: string, suggestUrl: string, searchUrl: string }> = {
    'websearch:google': {
        name: 'Google Search',
        suggestUrl: 'https://suggestqueries.google.com/complete/search?client=chrome&q=',
        searchUrl: 'https://google.com/search?q='
    }
}

const websearchSource: RootSource = {
    id: 'websearch',

    onStart: (emit) => {
        emit(Object.entries(PROVIDERS).map(([id, config]) => ({
            id,
            name: config.name,
            icon: Icons.search,
            sourceId: 'websearch'
        })))
    },

    navigate: {
        input: async (context, emit) => {
            const config = PROVIDERS[context.parent.id]
            if (!context.text) {
                emit([])
                return
            }

            const suggestions = await fetchSuggestions(config.suggestUrl, context.text)
            emit([
                // Raw search item
                {
                    id: `search:${context.text}`,
                    name: `Search "${context.text}"`,
                    icon: Icons.search,
                    sourceId: 'websearch-results',
                    metadata: { query: context.text, searchUrl: config.searchUrl }
                },
                // Suggestions
                ...suggestions.map(s => ({
                    id: `suggestion:${s}`,
                    name: s,
                    icon: Icons.search,
                    sourceId: 'websearch-results',
                    metadata: { query: s, searchUrl: config.searchUrl }
                }))
            ])
        }
    },

    handlers: {
        execute: (item) => {
            // Main item execute - open google.com
            shell.openExternal('https://google.com')
        }
    }
}

// Separate source for search results (suggestions)
const websearchResultsSource: ChildSource = {
    id: 'websearch-results',
    type: 'input',
    placeholder: 'Search Google...',

    onActivate: () => {}, // Not used - parent handles

    handlers: {
        execute: (item) => {
            const { query, searchUrl } = item.metadata!
            shell.openExternal(searchUrl + encodeURIComponent(query))
        }
    }
}
```

---

## Example: Apps Source

```ts
const appsSource: RootSource = {
    id: 'apps',

    onStart: async (emit) => {
        const apps = await indexApps()
        emit(apps.map(app => ({
            id: `app:${app.appId}`,
            name: app.name,
            icon: app.icon,
            sourceId: 'apps',
            metadata: { appId: app.appId }
        })))
    },

    navigate: {
        // Apps could support sendTo (send file to app)
        // For now, no navigation
    },

    handlers: {
        execute: (item) => {
            const appId = item.metadata!.appId
            exec(`start "" "shell:AppsFolder\\${appId}"`)
        }
    }
}
```

---

## Renderer Component Structure

```tsx
function App() {
    const state = useUIState()

    if (!state) return <Loading />

    return (
        <div className="launcher">
            <Header state={state} />
            <ItemList
                items={state.items}
                selectedIndex={state.selectedIndex}
            />
        </div>
    )
}

function Header({ state }: { state: UIState }) {
    switch (state.tag) {
        case 'root':
            return <RootHeader filterQuery={state.filterQuery} />
        case 'input':
            return <InputHeader
                parent={state.parent}
                placeholder={state.placeholder}
                text={state.text}
            />
        case 'browse':
        case 'sendTo':
        case 'actionMenu':
            return <BrowseHeader
                parent={state.parent}
                filterQuery={state.filterQuery}
            />
    }
}

function ItemList({ items, selectedIndex }: { items: ListItem[], selectedIndex: number }) {
    return (
        <div className="launcher-list">
            {items.map((item, index) => (
                <Item
                    key={item.id}
                    item={item}
                    selected={index === selectedIndex}
                />
            ))}
        </div>
    )
}
```

---

## Keyboard Handling

```tsx
function useKeyboard(state: UIState) {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // Arrow navigation - always available
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                window.electron.setSelectedIndex(
                    Math.min(state.selectedIndex + 1, state.items.length - 1)
                )
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                window.electron.setSelectedIndex(
                    Math.max(state.selectedIndex - 1, 0)
                )
                return
            }

            // Back navigation
            if (e.key === 'ArrowLeft' || e.key === 'Escape') {
                e.preventDefault()
                window.electron.back()
                return
            }

            // Execute
            if (e.key === 'Enter') {
                e.preventDefault()
                const item = state.items[state.selectedIndex]
                if (item) window.electron.execute(item)
                return
            }

            // Navigate - browse
            if (e.key === 'ArrowRight') {
                e.preventDefault()
                const item = state.items[state.selectedIndex]
                if (item) window.electron.navigate('browse', item)
                return
            }

            // Navigate - input
            if (e.key === ' ' && state.tag !== 'input') {
                e.preventDefault()
                const item = state.items[state.selectedIndex]
                if (item) window.electron.navigate('input', item)
                return
            }

            // Navigate - sendTo
            if (e.key === 'Tab') {
                e.preventDefault()
                const item = state.items[state.selectedIndex]
                if (item) window.electron.navigate('sendTo', item)
                return
            }

            // Filter typing (non-input modes)
            if (state.tag !== 'input' && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                window.electron.setFilterQuery(state.filterQuery + e.key)
                return
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [state])
}
```

---

## Implementation Order

1. **Phase 1: Core** (current functionality)
   - Root sources (apps, websearch)
   - Context stack with root + input
   - Basic execute handler
   - Filter query

2. **Phase 2: Browse**
   - Browse navigation (Right Arrow)
   - Folder source (list directory contents)
   - Left Arrow to go back

3. **Phase 3: SendTo**
   - Tab navigation
   - Send targets source
   - File actions (copy, move)

4. **Phase 4: Action Menu**
   - Ctrl+Right Arrow
   - Context-specific actions
   - Universal actions (copy name, reveal)

---

## Migration from Current Code

### Changes needed:

1. **store.ts**
   - Replace `mode` with `contextStack`
   - Replace separate handler registries with unified source registry
   - Update IPC handlers

2. **types.ts**
   - Add `StoreContext`, `UIState` types
   - Simplify `ListItem` (remove actions array)
   - Add source types

3. **Indexers → Sources**
   - `apps-indexer.ts` → `apps-source.ts`
   - `websearch-indexer.ts` → `websearch-source.ts`
   - Use new registration API

4. **App.tsx**
   - Handle all context types
   - Unified keyboard handling
   - Header per context type
