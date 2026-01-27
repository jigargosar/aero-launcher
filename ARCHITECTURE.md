# Launch Bar v2 - Architecture

## Overview

A keyboard-driven launcher with navigation-based architecture. All interactions are modeled as navigation through a context stack. Sources provide items and handle actions.

---

## Core Concepts

### 1. Items
Simple data objects. No behavior, no optional fields.

```ts
type ListItem = {
    id: string          // Unique across ALL items (e.g., 'app:Calculator', 'websearch:google')
    name: string        // Display name shown in UI
    icon: string        // Icon URL, data URI, or path
    sourceId: string    // Which source owns this item (used for handler lookup)
    metadata?: Record<string, string>  // Source-specific data (paths, URLs, etc.)
}
```

**Important:**
- `id` must be globally unique across all sources
- `sourceId` determines which source's handlers are called
- `metadata` is opaque to store - only the source interprets it

### 2. Sources
Provide items and handle actions. Single unified type with optional capabilities.

**Capabilities:**
- `onStart`: Emit items at startup (root-level items)
- `navigate.browse`: Handle Right Arrow navigation
- `navigate.input`: Handle Space navigation (text input)
- `navigate.sendTo`: Handle Tab navigation
- `navigate.actionMenu`: Handle Ctrl+Right Arrow navigation
- `handlers`: Execute actions on items

**Root vs Child behavior:**
- **Root sources**: Have `onStart` - emit items at startup (apps, websearch entries)
- **Child sources**: Have `navigate.*` handlers - emit items when navigated into
- **Hybrid sources**: Can have both (websearch has `onStart` AND `navigate.input`)

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

**Key behaviors:**
- Each context is immutable - contains all state needed to render
- Going back restores previous context exactly (including filterQuery/text)
- Root context is always at bottom of stack (never popped)
- Multiple same-type contexts allowed (folder → subfolder → subsubfolder)

**Context preservation:**
```
User flow:
1. Root (filterQuery: "")
2. → Browse Documents (filterQuery: "")
3. → Type "re" to filter (filterQuery: "re") → shows "readme.txt"
4. → Browse into subfolder
5. ← Back → Documents with filterQuery: "re" still applied!
```

---

## Types

### ActionType
```ts
type ActionType = 'execute' | 'preview' | 'reveal' | 'copy' | 'delete'
// Extensible - add more as needed
```

**Action descriptions:**
| Action | Key | Description |
|--------|-----|-------------|
| `execute` | Enter | Primary action - open, run, launch |
| `preview` | Cmd+Y | Quick Look / preview without opening |
| `reveal` | Cmd+Enter | Show in file explorer |
| `copy` | Cmd+C | Copy name/path to clipboard |
| `delete` | Cmd+Backspace | Move to trash |

### NavigationType
```ts
type NavigationType = 'browse' | 'input' | 'sendTo' | 'actionMenu'
```

**Navigation descriptions:**
| Type | Key | Description |
|------|-----|-------------|
| `browse` | Right Arrow | Navigate into item, show children |
| `input` | Space | Open text input, fetch dynamic items |
| `sendTo` | Tab | Pick target to send item to |
| `actionMenu` | Ctrl+Right Arrow | Show available actions |

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

### Source Type (Unified)
```ts
type Source = {
    id: string  // Unique source identifier

    // Called at startup to emit root-level items (optional)
    onStart?: (emit: EmitFn) => void

    // Navigation handlers - only define what source supports
    navigate?: {
        browse?: BrowseHandler
        input?: InputHandler
        sendTo?: BrowseHandler
        actionMenu?: BrowseHandler
    }

    // Input mode configuration (required if navigate.input is defined)
    inputConfig?: {
        placeholder: string  // e.g., "Search Google..."
    }

    // Action handlers for items from this source
    handlers: Partial<Record<ActionType, (item: ListItem) => void>>
}

type EmitFn = (items: ListItem[]) => void

type BrowseHandler = (
    context: BrowseContext,
    emit: EmitFn
) => void

type InputHandler = (
    context: InputContext,
    emit: EmitFn
) => void

type BrowseContext = {
    parent: ListItem
    filterQuery: string
}

type InputContext = {
    parent: ListItem
    text: string
}
```

### Registration API
```ts
interface StoreAPI {
    registerSource(source: Source): void
}
```

### How Placeholder is Determined
When entering input mode:
1. Store looks up source by `item.sourceId`
2. Gets `source.inputConfig.placeholder`
3. Sends to renderer in UIState

```ts
// In store, when navigating to input
const source = sources.get(item.sourceId)
const placeholder = source.inputConfig?.placeholder ?? ''
// UIState includes: { tag: 'input', placeholder, ... }
```

### Source Validation (at registration)
```ts
function registerSource(source: Source) {
    // Validate: if navigate.input exists, inputConfig.placeholder must exist
    if (source.navigate?.input && !source.inputConfig?.placeholder) {
        throw new Error(`Source ${source.id}: input navigation requires inputConfig.placeholder`)
    }

    sources.set(source.id, source)
}
```

### Source Lookup Flow
When an action/navigation is triggered on an item:
1. Get `item.sourceId`
2. Look up `sources.get(sourceId)`
3. Check if source has the required handler
4. If yes: call handler
5. If no: no-op (or beep/visual feedback)

---

## Store State

```ts
type Store = {
    // Context stack (current = last element, minimum 1 = root)
    contextStack: StoreContext[]

    // Items for current context (unfiltered)
    // Filtering is computed on demand when building UIState
    currentItems: ListItem[]

    // Selection
    selectedIndex: number

    // Registered sources
    sources: Map<string, Source>

    // Root items cache (from all sources with onStart)
    rootItems: Map<string, ListItem[]>  // sourceId → items

    // Ranking context (for learning user preferences)
    rankingContext: RankingContext
}
```

**Why no `filteredItems`?**
Filtering is computed when building UIState, not stored:

```ts
function buildUIState(): UIState {
    const ctx = currentContext()
    const query = ctx.tag === 'input' ? '' : ctx.filterQuery

    // Compute filtered items on demand
    const items = query
        ? filterAndRank(currentItems, query, rankingContext)
        : currentItems

    return { ...ctx, items, selectedIndex }
}
```

**Why `currentItems` separate from context?**
- Context is immutable (for back navigation)
- Items can be re-emitted by source without changing context
- Separation of concerns: context = navigation state, items = data

### Current Context Helper
```ts
function currentContext(store: Store): StoreContext {
    return store.contextStack[store.contextStack.length - 1]
}
```

### Filtering Logic

**For root context:**
```ts
function getFilteredItems(store: Store): ListItem[] {
    const ctx = currentContext(store)
    const allRootItems = [...store.rootItems.values()].flat()

    if (ctx.tag === 'root') {
        return filterAndRank(allRootItems, ctx.filterQuery, store.rankingContext)
    }
    // ... other contexts
}
```

**For browse/sendTo/actionMenu contexts:**
```ts
// Filter is applied locally to children
const filtered = store.allItems.filter(item =>
    item.name.toLowerCase().includes(ctx.filterQuery.toLowerCase())
)
```

**For input context:**
- No filtering - source handles text and emits relevant items
- `text` is sent to source, source fetches/filters

### Ranking Integration

```ts
type RankingContext = {
    selectionCounts: Map<string, Map<string, number>>  // query → itemId → count
}

function filterAndRank(items: ListItem[], query: string, ranking: RankingContext): ListItem[] {
    // 1. Filter by query (abbreviation match)
    const filtered = items.filter(item => matchesQuery(item.name, query))

    // 2. Sort by ranking score
    return filtered.sort((a, b) => {
        const scoreA = getRankingScore(ranking, query, a.id)
        const scoreB = getRankingScore(ranking, query, b.id)
        return scoreB - scoreA  // Higher score first
    })
}

function recordSelection(ranking: RankingContext, query: string, itemId: string) {
    // Increment selection count for this query → item pair
    if (!ranking.selectionCounts.has(query)) {
        ranking.selectionCounts.set(query, new Map())
    }
    const counts = ranking.selectionCounts.get(query)!
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1)
}
```

### Filter Query Timeout
In root/browse modes, typing accumulates into filterQuery with a timeout reset:

```ts
// In renderer
let lastKeyTime = 0
const TIMEOUT_MS = 1000

function onKeyPress(key: string) {
    const now = Date.now()
    if (now - lastKeyTime > TIMEOUT_MS) {
        // Reset - start new query
        setFilterQuery(key)
    } else {
        // Append to existing query
        setFilterQuery(filterQuery + key)
    }
    lastKeyTime = now
}
```

---

## IPC Channels

### Channel Names
```ts
const channels = {
    // Renderer → Main
    requestState: 'request-state',
    navigate: 'navigate',
    back: 'back',
    setInputText: 'set-input-text',
    setFilterQuery: 'set-filter-query',
    execute: 'execute',
    setSelectedIndex: 'set-selected-index',
    hideWindow: 'hide-window',

    // Main → Renderer
    state: 'state',
}
```

### Renderer → Main (ElectronAPI)

```ts
type ElectronAPI = {
    // Request current state (called on startup)
    requestState: () => void

    // Navigation - push new context
    navigate: (type: NavigationType, item: ListItem) => void

    // Back - pop context stack
    back: () => void

    // Input text (input mode only)
    setInputText: (text: string) => void

    // Filter query (root/browse/sendTo/actionMenu modes)
    setFilterQuery: (query: string) => void

    // Execute action on item
    execute: (item: ListItem) => void

    // Selection
    setSelectedIndex: (index: number) => void

    // Window management
    hideWindow: () => void
}
```

### Main → Renderer

```ts
type MainEvents = {
    // State update - sent whenever state changes
    onState: (callback: (state: UIState) => void) => void
}
```

### Preload Bridge
```ts
// preload.ts
const api: ElectronAPI = {
    requestState: () => ipcRenderer.send(channels.requestState),
    navigate: (type, item) => ipcRenderer.send(channels.navigate, type, item),
    back: () => ipcRenderer.send(channels.back),
    setInputText: (text) => ipcRenderer.send(channels.setInputText, text),
    setFilterQuery: (query) => ipcRenderer.send(channels.setFilterQuery, query),
    execute: (item) => ipcRenderer.send(channels.execute, item),
    setSelectedIndex: (index) => ipcRenderer.send(channels.setSelectedIndex, index),
    hideWindow: () => ipcRenderer.send(channels.hideWindow),

    onState: (callback) => {
        ipcRenderer.on(channels.state, (_, state) => callback(state))
    }
}

contextBridge.exposeInMainWorld('electron', api)
```

### IPC Handler Registration (Main)
```ts
// In store.ts init()
ipcMain.on(channels.requestState, () => sendState())
ipcMain.on(channels.navigate, (_, type: NavigationType, item: ListItem) => handleNavigate(type, item))
ipcMain.on(channels.back, () => handleBack())
ipcMain.on(channels.setInputText, (_, text: string) => handleSetInputText(text))
ipcMain.on(channels.setFilterQuery, (_, query: string) => handleSetFilterQuery(query))
ipcMain.on(channels.execute, (_, item: ListItem) => handleExecute(item))
ipcMain.on(channels.setSelectedIndex, (_, index: number) => handleSetSelectedIndex(index))
ipcMain.on(channels.hideWindow, () => {
    window.blur()
    window.hide()
})
```

---

## Flows

### Startup Flow
```
1. Main process creates BrowserWindow
2. Store.init(window) called:
   a. Initialize empty state:
      - contextStack = [{ tag: 'root', filterQuery: '' }]
      - sources = new Map()
      - rootItems = new Map()
   b. Register IPC handlers
   c. Return StoreAPI for source registration

3. Each source registers:
   store.registerSource(appsSource)
   store.registerSource(websearchSource)

4. Store calls source.onStart(emit) for each source that has it:
   - Source fetches/indexes items
   - Source calls emit(items)
   - Store saves to rootItems.set(sourceId, items)

5. Store computes initial UIState and sends to renderer

6. Renderer receives state, renders UI
```

### Normal Mode - Filter Flow
```
1. User types "g"
   - Renderer: keydown event
   - Check: not in input mode, single char, no modifiers
   - Call: window.electron.setFilterQuery("g")

2. Store receives setFilterQuery("g"):
   a. Get current context (root)
   b. Update: context.filterQuery = "g"
   c. Filter: allRootItems.filter(item => matchesQuery(item.name, "g"))
   d. Rank: sort by selection history
   e. Update: selectedIndex = 0 (reset to top)
   f. Send: UIState to renderer

3. User types "o" (within timeout)
   - Renderer: append to query → "go"
   - Store: filter with "go"

4. User waits > 1 second, types "x"
   - Renderer: reset query → "x"
   - Store: filter with "x"
```

### Navigate - Browse Flow (Right Arrow)
```
1. User presses Right Arrow on "Documents" folder
2. Renderer:
   a. Get selectedItem from state
   b. Call: window.electron.navigate('browse', documentsItem)

3. Store receives navigate('browse', item):
   a. Look up source: sources.get(item.sourceId)
   b. Check: source.navigate?.browse exists
      - If not: no-op, return (source doesn't support browse)
   c. Create context: { tag: 'browse', parent: item, filterQuery: '' }
   d. Push to contextStack
   e. Call: source.navigate.browse(context, emit)

4. Source (files source) handles:
   a. Read directory: item.metadata.path
   b. Create ListItems for each file/folder
   c. Call: emit(items)

5. Store receives emitted items:
   a. Store: allItems = items
   b. Filter: (filterQuery is empty, so all items)
   c. selectedIndex = 0
   d. Send: UIState to renderer

6. Renderer updates:
   - Header shows parent item (Documents)
   - List shows children (files/folders)
```

### Navigate - Input Flow (Space)
```
1. User presses Space on "Google Search"
2. Renderer:
   a. Check: not already in input mode
   b. Get selectedItem
   c. Call: window.electron.navigate('input', googleItem)

3. Store receives navigate('input', item):
   a. Look up source: sources.get('websearch')
   b. Check: source.navigate?.input exists
   c. Get placeholder: source.inputConfig.placeholder
   d. Create context: { tag: 'input', parent: item, text: '' }
   e. Push to contextStack
   f. Call: source.navigate.input(context, emit)

4. Source handles (text is empty):
   a. emit([]) - no suggestions yet

5. Store sends UIState:
   {
     tag: 'input',
     parent: googleItem,
     placeholder: 'Search Google...',
     text: '',
     items: [],
     selectedIndex: 0
   }

6. Renderer shows:
   - Input box with placeholder
   - Empty list

7. User types "weather":
   a. Input onChange fires
   b. Call: window.electron.setInputText('weather')

8. Store receives setInputText('weather'):
   a. Update context: context.text = 'weather'
   b. Call: source.navigate.input(context, emit)

9. Source handles (text = 'weather'):
   a. Fetch suggestions from Google API
   b. Create items (including "Search 'weather'" item)
   c. Call: emit(items)

10. Store sends updated UIState with suggestions

11. User selects suggestion, presses Enter:
    a. Renderer: window.electron.execute(selectedItem)
    b. Store: source.handlers.execute(item)
    c. Source: opens browser with search URL
    d. Store: hides window
```

### Navigate - SendTo Flow (Tab)
```
1. User selects "readme.txt", presses Tab
2. Renderer: window.electron.navigate('sendTo', readmeItem)

3. Store:
   a. Look up source for readme's sourceId (files)
   b. Check: source.navigate?.sendTo exists
   c. Create context: { tag: 'sendTo', parent: readmeItem, filterQuery: '' }
   d. Push to contextStack
   e. Call: source.navigate.sendTo(context, emit)

4. Source emits targets:
   - Recent folders
   - Favorite apps
   - Email contacts
   - Each target is a ListItem with its own sourceId

5. User navigates to "Documents" folder, presses Enter:
   a. Store: execute(documentsItem)
   b. Documents item's source handles:
      - Checks: we're in sendTo context
      - Gets parent item (readme.txt) from context
      - Shows action menu: Move, Copy, Create Alias

6. User selects "Copy", presses Enter:
   a. Copy action executes
   b. Store: clears context stack back to root
   c. Store: hides window
```

### Navigate - Back Flow (Left Arrow / Escape)
```
1. User presses Left Arrow (or Escape)
2. Renderer: window.electron.back()

3. Store handles back():
   a. Check: contextStack.length > 1
      - If only root:
        - Left Arrow: no-op
        - Escape: hide window
   b. Pop: contextStack.pop()
   c. Get: new current context (previous one)
   d. Restore items:
      - If root: use rootItems
      - If browse/sendTo: re-emit from source (or cache)
   e. Send: UIState

4. Renderer updates to show previous context
   - filterQuery is preserved!
```

### Execute Flow (Enter)
```
1. User presses Enter on selected item
2. Renderer: window.electron.execute(selectedItem)

3. Store handles execute(item):
   a. Look up source: sources.get(item.sourceId)
   b. Check: source.handlers?.execute exists
      - If not: log error, return
   c. Record selection for ranking:
      recordSelection(rankingContext, currentQuery, item.id)
   d. Call: source.handlers.execute(item)

4. Source executes:
   - App: launch via shell
   - File: open with default app
   - Search result: open URL in browser

5. Store post-execute:
   a. Hide window: window.blur(); window.hide()
   b. Optionally: reset to root context
   c. Send: UIState (for next show)
```

### Window Show Flow
```
1. Global hotkey triggers show
2. Main process: window.show(); window.focus()
3. Store:
   a. Optionally reset to root context
   b. Clear filterQuery
   c. selectedIndex = 0
   d. Send: UIState
4. Renderer: focus input (if input mode) or ready for typing
```

---

## Example: WebSearch Source

```ts
// websearch-source.ts
import { shell, net } from 'electron'
import { Source, ListItem, InputContext, EmitFn } from './types'
import { Icons } from '@shared/icons'

// Provider configuration - single source of truth
const PROVIDERS: Record<string, {
    name: string
    suggestUrl: string
    searchUrl: string
    icon: string
}> = {
    'websearch:google': {
        name: 'Google Search',
        suggestUrl: 'https://suggestqueries.google.com/complete/search?client=chrome&q=',
        searchUrl: 'https://google.com/search?q=',
        icon: Icons.search
    },
    'websearch:bing': {
        name: 'Bing Search',
        suggestUrl: 'https://api.bing.com/osjson.aspx?query=',
        searchUrl: 'https://bing.com/search?q=',
        icon: Icons.search
    }
}

// Fetch suggestions from provider API
async function fetchSuggestions(suggestUrl: string, query: string): Promise<string[]> {
    if (!query.trim()) return []

    try {
        const response = await net.fetch(suggestUrl + encodeURIComponent(query))
        const data = await response.json() as [string, string[]]
        return data[1] ?? []
    } catch (error) {
        console.error('[WebSearch] Suggestion fetch failed:', error)
        return []
    }
}

// Main websearch source - provides search entry items
export const websearchSource: Source = {
    id: 'websearch',

    // Emit search provider items at startup
    onStart: (emit) => {
        const items = Object.entries(PROVIDERS).map(([id, config]) => ({
            id,
            name: config.name,
            icon: config.icon,
            sourceId: 'websearch'  // Items from this source
        }))
        emit(items)
        console.log(`[WebSearch] Emitted ${items.length} search providers`)
    },

    // Input configuration
    inputConfig: {
        placeholder: 'Search...'  // Default, could be per-provider
    },

    // Handle Space navigation - show input for search
    navigate: {
        input: async (context: InputContext, emit: EmitFn) => {
            const config = PROVIDERS[context.parent.id]
            if (!config) {
                console.error(`[WebSearch] Unknown provider: ${context.parent.id}`)
                emit([])
                return
            }

            // No text yet - emit empty
            if (!context.text.trim()) {
                emit([])
                return
            }

            // Fetch suggestions
            const suggestions = await fetchSuggestions(config.suggestUrl, context.text)

            // Build result items
            const items: ListItem[] = [
                // "Search for X" item - always first
                {
                    id: `websearch:search:${context.text}`,
                    name: `Search "${context.text}"`,
                    icon: config.icon,
                    sourceId: 'websearch-results',
                    metadata: {
                        query: context.text,
                        searchUrl: config.searchUrl
                    }
                },
                // Suggestions
                ...suggestions.map(s => ({
                    id: `websearch:suggestion:${s}`,
                    name: s,
                    icon: config.icon,
                    sourceId: 'websearch-results',
                    metadata: {
                        query: s,
                        searchUrl: config.searchUrl
                    }
                }))
            ]

            emit(items)
        }
    },

    // Execute on main item (Google Search, Bing Search)
    // Note: Usually not called - Enter goes to input mode
    handlers: {
        execute: (item) => {
            const config = PROVIDERS[item.id]
            if (config) {
                // Open provider homepage
                const baseUrl = config.searchUrl.replace('/search?q=', '')
                shell.openExternal(baseUrl)
            }
        }
    }
}

// Separate source for search results (suggestions)
// Items emitted by websearch have sourceId: 'websearch-results'
export const websearchResultsSource: Source = {
    id: 'websearch-results',

    // No onStart - these items are created dynamically by parent

    // No inputConfig - results don't support further input

    // No navigate - results are leaf items

    handlers: {
        execute: (item) => {
            const query = item.metadata?.query
            const searchUrl = item.metadata?.searchUrl

            if (!query || !searchUrl) {
                console.error('[WebSearch] Missing metadata on result item:', item.id)
                return
            }

            shell.openExternal(searchUrl + encodeURIComponent(query))
        }
    }
}
```

**Key points:**
1. `PROVIDERS` map is single source of truth for configuration
2. Main items have `sourceId: 'websearch'` - use websearchSource handlers
3. Result items have `sourceId: 'websearch-results'` - use websearchResultsSource handlers
4. Metadata carries `query` and `searchUrl` so results are self-contained
5. Parent source handles navigation, child source handles execution

---

## Example: Apps Source

```ts
// apps-source.ts
import { exec } from 'child_process'
import { app } from 'electron'
import { Source, ListItem, EmitFn } from './types'
import { Icons } from '@shared/icons'

// Cache paths
const CACHE_DIR = join(app.getPath('userData'), 'cache')
const CACHE_FILE = join(CACHE_DIR, 'apps.json')

// Index Windows apps via PowerShell
async function indexApps(): Promise<Array<{ appId: string, name: string, icon: string }>> {
    // ... PowerShell implementation
}

export const appsSource: Source = {
    id: 'apps',

    onStart: async (emit) => {
        console.log('[Apps] Starting indexer...')

        // Load cached items first for fast startup
        try {
            const cached = await readCache()
            if (cached.length > 0) {
                emit(cached)
                console.log(`[Apps] Loaded ${cached.length} cached apps`)
            }
        } catch {
            // No cache, continue to index
        }

        // Index fresh
        const apps = await indexApps()
        const items: ListItem[] = apps.map(app => ({
            id: `app:${app.appId}`,
            name: app.name,
            icon: app.icon || Icons.default,
            sourceId: 'apps',
            metadata: { appId: app.appId }
        }))

        // Update cache
        await writeCache(items)

        // Emit fresh items
        emit(items)
        console.log(`[Apps] Indexed ${items.length} apps`)
    },

    navigate: {
        // Apps support sendTo - when a file is sent to an app
        sendTo: (context, emit) => {
            // context.parent is the file being sent
            // Emit this app as a target that can receive the file
            // This is called by file source, not directly
        }
    },

    handlers: {
        execute: (item) => {
            const appId = item.metadata?.appId
            if (!appId) {
                console.error('[Apps] Missing appId in metadata:', item.id)
                return
            }

            // Launch via Windows shell
            exec(`start "" "shell:AppsFolder\\${appId}"`, (error) => {
                if (error) {
                    console.error('[Apps] Launch failed:', error)
                }
            })
        }
    }
}
```

---

## Example: Files Source (Future)

```ts
// files-source.ts
import { shell } from 'electron'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { Source, ListItem, BrowseContext, EmitFn } from './types'
import { Icons } from '@shared/icons'

export const filesSource: Source = {
    id: 'files',

    // No onStart - files aren't indexed at root level
    // (Could add recent files, favorites, etc.)

    navigate: {
        // Browse into folder - show contents
        browse: async (context: BrowseContext, emit: EmitFn) => {
            const folderPath = context.parent.metadata?.path
            if (!folderPath) {
                console.error('[Files] Missing path in metadata:', context.parent.id)
                emit([])
                return
            }

            try {
                const entries = await readdir(folderPath, { withFileTypes: true })
                const items: ListItem[] = await Promise.all(
                    entries.map(async entry => {
                        const fullPath = join(folderPath, entry.name)
                        const isDirectory = entry.isDirectory()

                        return {
                            id: `file:${fullPath}`,
                            name: entry.name,
                            icon: isDirectory ? Icons.folder : Icons.file,
                            sourceId: 'files',
                            metadata: {
                                path: fullPath,
                                isDirectory: isDirectory ? 'true' : 'false'
                            }
                        }
                    })
                )

                emit(items)
            } catch (error) {
                console.error('[Files] Read directory failed:', error)
                emit([])
            }
        },

        // SendTo - show where this file can be sent
        sendTo: async (context: BrowseContext, emit: EmitFn) => {
            // Emit recent folders, favorite destinations, apps
            const targets: ListItem[] = [
                // Recent folders
                // Favorite apps
                // Email contacts (if available)
            ]
            emit(targets)
        },

        // ActionMenu - show available actions
        actionMenu: (context: BrowseContext, emit: EmitFn) => {
            const isDirectory = context.parent.metadata?.isDirectory === 'true'

            const actions: ListItem[] = [
                {
                    id: 'action:reveal',
                    name: 'Reveal in Explorer',
                    icon: Icons.folder,
                    sourceId: 'file-actions',
                    metadata: { action: 'reveal', targetPath: context.parent.metadata?.path }
                },
                {
                    id: 'action:copy-path',
                    name: 'Copy Path',
                    icon: Icons.copy,
                    sourceId: 'file-actions',
                    metadata: { action: 'copy-path', targetPath: context.parent.metadata?.path }
                },
                {
                    id: 'action:delete',
                    name: 'Move to Trash',
                    icon: Icons.trash,
                    sourceId: 'file-actions',
                    metadata: { action: 'delete', targetPath: context.parent.metadata?.path }
                }
            ]

            emit(actions)
        }
    },

    handlers: {
        execute: (item) => {
            const filePath = item.metadata?.path
            if (!filePath) {
                console.error('[Files] Missing path in metadata:', item.id)
                return
            }

            shell.openPath(filePath)
        },

        reveal: (item) => {
            const filePath = item.metadata?.path
            if (filePath) {
                shell.showItemInFolder(filePath)
            }
        }
    }
}

// Separate source for file actions
export const fileActionsSource: Source = {
    id: 'file-actions',

    handlers: {
        execute: (item) => {
            const action = item.metadata?.action
            const targetPath = item.metadata?.targetPath

            if (!action || !targetPath) {
                console.error('[FileActions] Missing metadata:', item.id)
                return
            }

            switch (action) {
                case 'reveal':
                    shell.showItemInFolder(targetPath)
                    break
                case 'copy-path':
                    clipboard.writeText(targetPath)
                    break
                case 'delete':
                    shell.trashItem(targetPath)
                    break
            }
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

## Error Handling

### Source Handler Errors
```ts
function safeCall<T>(fn: () => T, fallback: T, context: string): T {
    try {
        return fn()
    } catch (error) {
        console.error(`[Store] ${context}:`, error)
        return fallback
    }
}

// Usage in store
function handleNavigate(type: NavigationType, item: ListItem) {
    const source = sources.get(item.sourceId)
    if (!source) {
        console.error(`[Store] No source for sourceId: ${item.sourceId}`)
        return
    }

    const handler = source.navigate?.[type]
    if (!handler) {
        console.log(`[Store] Source ${item.sourceId} doesn't support ${type} navigation`)
        return  // Silent - not an error, just unsupported
    }

    safeCall(
        () => handler(context, emit),
        undefined,
        `${item.sourceId}.navigate.${type}`
    )
}
```

### Missing Handler Logging
```ts
function handleExecute(item: ListItem) {
    const source = sources.get(item.sourceId)
    if (!source) {
        console.error(`[Store] No source registered for: ${item.sourceId}`)
        return
    }

    if (!source.handlers?.execute) {
        console.error(`[Store] No execute handler for source: ${item.sourceId}`)
        return
    }

    source.handlers.execute(item)
}
```

### Async Error Handling in Sources
```ts
navigate: {
    input: async (context, emit) => {
        try {
            const suggestions = await fetchSuggestions(context.text)
            emit(suggestions)
        } catch (error) {
            console.error('[WebSearch] Fetch failed:', error)
            emit([])  // Emit empty on error - don't crash
        }
    }
}
```

---

## Scroll Behavior

### Scroll Into View on Arrow Navigation
```tsx
function ItemList({ items, selectedIndex, shouldScrollRef }) {
    return (
        <div className="launcher-list">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    ref={index === selectedIndex ? el => {
                        if (shouldScrollRef.current && el) {
                            el.scrollIntoView({ block: 'nearest' })
                            shouldScrollRef.current = false
                        }
                    } : undefined}
                    className={`item ${index === selectedIndex ? 'selected' : ''}`}
                >
                    ...
                </div>
            ))}
        </div>
    )
}
```

### Triggering Scroll
```ts
// In keyboard handler
if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    shouldScrollRef.current = true  // Flag for next render
    window.electron.setSelectedIndex(newIndex)
}
```

---

## Window Management

### Show Window (Global Hotkey)
```ts
// In main process
globalShortcut.register('Alt+Space', () => {
    if (window.isVisible()) {
        window.hide()
    } else {
        window.show()
        window.focus()
        // Optionally reset state
        store.resetToRoot()
    }
})
```

### Hide Window
```ts
function handleHideWindow() {
    window.blur()
    window.hide()
}

// Called after execute (optionally)
function handleExecute(item: ListItem) {
    // ... execute logic
    window.blur()
    window.hide()
}
```

### Window Blur on Escape at Root
```ts
function handleBack() {
    if (contextStack.length === 1) {
        // At root - hide window
        window.blur()
        window.hide()
        return
    }
    // ... pop context
}
```

---

## Implementation Order

### Phase 1: Core Refactor
**Goal:** Replace current mode-based system with context stack

1. **types.ts changes:**
   - Remove `ItemAction`, `ListMode` (old types)
   - Add `StoreContext`, `UIState`, `Source` types
   - Simplify `ListItem` (remove actions array)

2. **store.ts changes:**
   - Replace `mode` with `contextStack`
   - Replace `executeHandlers`/`inputHandlers` with `sources` Map
   - Add `registerSource()` function
   - Update all IPC handlers

3. **Indexers → Sources:**
   - `apps-indexer.ts` → `apps-source.ts`
   - `websearch-indexer.ts` → `websearch-source.ts`
   - Both sources registered in store

4. **preload.ts changes:**
   - Update API to match new channels

5. **App.tsx changes:**
   - Handle `UIState` discriminated union
   - Update keyboard handler
   - Remove old mode-specific code

### Phase 2: Browse Navigation
**Goal:** Right Arrow navigates into items

1. Add `navigate.browse` support in store
2. Create `files-source.ts` for folder browsing
3. Left Arrow goes back
4. Filter query works in browse mode

### Phase 3: SendTo Navigation
**Goal:** Tab sends items to targets

1. Add `navigate.sendTo` support in store
2. Create send targets source
3. File operations (copy, move)
4. Multi-step flow (file → folder → action)

### Phase 4: Action Menu
**Goal:** Ctrl+Right Arrow shows actions

1. Add `navigate.actionMenu` support
2. Context-specific actions per source
3. Universal actions (copy name, reveal)
4. Keyboard shortcuts for common actions

---

## Migration from Current Code

### Current vs New Type Comparison

**ListItem (Current):**
```ts
type ListItem = {
    sourceId: string
    id: string
    name: string
    icon: string
    actions: ItemAction[]  // REMOVE
    metadata?: Record<string, string>
}
```

**ListItem (New):**
```ts
type ListItem = {
    id: string
    name: string
    icon: string
    sourceId: string
    metadata?: Record<string, string>
}
// No actions array - source determines capabilities
```

**Mode (Current):**
```ts
type ListMode =
    | { tag: 'normal', items: ListItem[], selectedIndex: number }
    | { tag: 'input', item: ListItem, text: string, ... }
```

**UIState (New):**
```ts
type UIState =
    | { tag: 'root', items: ListItem[], selectedIndex: number, filterQuery: string }
    | { tag: 'input', parent: ListItem, placeholder: string, text: string, items: ListItem[], selectedIndex: number }
    | { tag: 'browse', parent: ListItem, items: ListItem[], selectedIndex: number, filterQuery: string }
    | { tag: 'sendTo', ... }
    | { tag: 'actionMenu', ... }
```

### File-by-File Changes

**1. src/shared/types.ts**
```ts
// Remove:
- ItemAction type
- ListMode type (replaced by UIState)
- Old channel names

// Add:
+ StoreContext type
+ UIState type
+ Source type
+ BrowseContext, InputContext types
+ NavigationType, ActionType
+ New channel names

// Modify:
~ ListItem - remove actions array
~ ElectronAPI - new method signatures
```

**2. src/main/store.ts**
```ts
// Remove:
- executeHandlers Map
- inputHandlers Map
- StoreMode type
- mode variable
- registerExecuteHandler()
- registerInputHandler()

// Add:
+ sources Map<string, Source>
+ contextStack: StoreContext[]
+ rootItems Map<string, ListItem[]>
+ registerSource(source: Source)
+ handleNavigate(type, item)
+ handleBack()
+ getCurrentItems()
+ sendUIState()

// Modify:
~ init() - new initialization flow
~ All IPC handlers - new signatures
```

**3. src/main/apps-indexer.ts → src/main/sources/apps-source.ts**
```ts
// Change from:
export const Apps = {
    id: 'apps',
    async start(onUpdate, store) {
        store.registerExecuteHandler('apps', (item) => {...})
        onUpdate(items)
    }
}

// Change to:
export const appsSource: Source = {
    id: 'apps',
    onStart: (emit) => {
        emit(items)
    },
    handlers: {
        execute: (item) => {...}
    }
}
```

**4. src/main/websearch-indexer.ts → src/main/sources/websearch-source.ts**
```ts
// Change from:
store.registerExecuteHandler('websearch', ...)
store.registerInputHandler('websearch', { onQuery, onSubmit })

// Change to:
export const websearchSource: Source = {
    id: 'websearch',
    onStart: (emit) => { emit(providers) },
    inputConfig: { placeholder: 'Search...' },
    navigate: {
        input: (context, emit) => { /* fetch suggestions */ }
    },
    handlers: {
        execute: (item) => {...}
    }
}
```

**5. src/preload/preload.ts**
```ts
// Update API methods:
- executeItem → execute
- enterInputMode → navigate('input', item)
- setInputText → setInputText (same)
- submitInput → (removed - use execute)
- exitInputMode → back()
+ navigate(type, item)
+ back()
+ setFilterQuery(query)
```

**6. src/renderer/src/App.tsx**
```ts
// Remove:
- useLauncher hook complexity
- Separate input mode handling
- isNormalMode, isInputMode

// Add:
+ useUIState hook
+ useKeyboard hook
+ Header component with switch on tag
+ Unified ItemList component

// Modify:
~ Keyboard handling - unified switch
~ Render based on UIState.tag
```

### Migration Steps

1. **Create new types first** (types.ts)
   - Add new types alongside old ones
   - Both can coexist temporarily

2. **Create source files** (sources/*.ts)
   - New source format
   - Don't delete old indexers yet

3. **Update store.ts**
   - Add new logic
   - Keep old IPC handlers working
   - Add new IPC handlers

4. **Update preload.ts**
   - Add new API methods
   - Keep old ones for compatibility

5. **Update App.tsx**
   - Switch to new UIState
   - Test thoroughly

6. **Clean up**
   - Remove old indexers
   - Remove old types
   - Remove old IPC handlers

---

## Future Enhancements

### Potential Features
- **Clipboard history** - Track clipboard, paste previous items
- **Calculator** - Inline math evaluation
- **Snippets** - Text expansion
- **Window switcher** - Switch between open windows
- **System commands** - Sleep, restart, lock
- **Bookmarks** - Browser bookmarks integration
- **Recent files** - Quick access to recent documents

### Performance Considerations
- **Lazy loading** - Don't index everything at startup
- **Caching** - Cache indexed items
- **Debouncing** - Debounce input text for API calls
- **Virtual scrolling** - For large lists

### Extensibility
- **Plugin system** - Third-party sources
- **Custom actions** - User-defined actions
- **Themes** - Customizable appearance
- **Keyboard shortcuts** - Configurable bindings
