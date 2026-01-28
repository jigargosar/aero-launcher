# Launch Bar v2 - Architecture v4

## Core Types

```ts
type Item = {
    id: string
    name: string
    icon: string
    moduleId: string              // which module handles this item
    metadata: Record<string, any> // module-specific data
}

type Trigger =
    | { type: 'execute' }                    // Return: primary action
    | { type: 'browse' }                     // →: navigate into children
    | { type: 'sendTo' }                     // Tab: send to target
    | { type: 'actionMenu' }                 // Ctrl+→: show actions
    | { type: 'secondary' }                  // Shift+Return: reveal, etc.
    | { type: 'textChange'; text: string }   // typing in input mode

type Response =
    | { type: 'pushList'; items: Item[] }
    | { type: 'pushInput'; placeholder: string }
    | { type: 'updateItems'; items: Item[] }
    | { type: 'pop' }
    | { type: 'reset' }
    | { type: 'hide' }
    | { type: 'noop' }
```

## Module

```ts
type Module = {
    onTrigger: (item: Item, trigger: Trigger) => Promise<Response>
}

// Registration
modules.set('folder', folderModule)
modules.set('websearch', websearchModule)
modules.set('app', appModule)
```

## Routing

```ts
function handleTrigger(item: Item, trigger: Trigger) {
    const module = modules.get(item.moduleId)
    return module.onTrigger(item, trigger)
}
```

## State (Frame Stack)

```ts
type Frame =
    | { tag: 'list'; items: Item[]; query: string; parent?: Item }
    | { tag: 'input'; items: Item[]; text: string; parent: Item; placeholder: string }

type State = {
    stack: Frame[]      // min 1 (root)
    selected: number
}
```

## Navigation

| Key | Action | Store handles |
|-----|--------|---------------|
| ← | Back one level | pop stack |
| Esc | Reset to root | clear stack |
| Activation | Reset to initial | clear stack |

## Key Principles

1. Item = moduleId + metadata - module decides structure
2. Module handles ALL its items - namespace via moduleId
3. Triggers are semantic - not keyboard names
4. Responses tell store what to do - pushList, pushInput, pop, etc.
5. Pull model - store calls module, module returns response
6. Items are self-contained - carry all data needed for execution

---

# Addendum 1: Item Triggers & Store Ownership

## Item Triggers

```ts
// Trigger type names (for item's supported list)
type TriggerType = Trigger['type']

type Item = {
    ...
    triggers: TriggerType[]
}
```

UI uses triggers array for visual hints (chevron if `browse` supported, etc.)

## Store Owns All State

Store owns:

```ts
type State = {
    stack: Frame[]
    selected: number
}

type Frame =
    | { tag: 'list'; items: Item[]; query: string; parent?: Item }
    | { tag: 'input'; items: Item[]; text: string; parent: Item; placeholder: string }
```

UI just renders and sends events:

```
Store → UIState → Renderer (renders)
Renderer → Events → Store (updates)
```

Events from UI:

```ts
type UIEvent =
    | { type: 'setQuery'; query: string }
    | { type: 'setText'; text: string }
    | { type: 'setSelected'; index: number }
    | { type: 'trigger'; item: Item; trigger: Trigger }
```

Flow:

1. Store has state
2. Store sends UIState to renderer
3. Renderer renders
4. User types → renderer sends `{ type: 'setQuery', query: 'goo' }`
5. Store updates frame.query, filters items, sends new UIState
6. User presses Enter → renderer sends `{ type: 'trigger', item, trigger: { type: 'execute' } }`
7. Store routes to module, handles response

UI is dumb. Store is smart.

---

# Addendum 2: Selection Per Frame

`selected` should be per-frame, not global. When user goes back, selection restores.

```ts
type Frame =
    | { tag: 'list'; items: Item[]; query: string; parent?: Item; selected: number }
    | { tag: 'input'; items: Item[]; text: string; parent: Item; placeholder: string; selected: number }

type State = {
    stack: Frame[]
}
```

---

# Addendum 3: IPC Channels

Two channels, one each direction:

```ts
// Main → Renderer
send('state', uiState: UIState)

// Renderer → Main
send('event', event: UIEvent)

type UIState = Frame  // current frame from top of stack

type UIEvent =
    | { type: 'setQuery'; query: string }
    | { type: 'setText'; text: string }
    | { type: 'setSelected'; index: number }
    | { type: 'trigger'; item: Item; trigger: Trigger }
```

---

# Addendum 4: Query vs Text Input

`setQuery` is for list frame, `setText` is for input frame. Mutually exclusive.

**Option 1: Keep both, renderer decides:**
```ts
if (frame.tag === 'list') send({ type: 'setQuery', query })
if (frame.tag === 'input') send({ type: 'setText', text })
```

**Option 2: Unify into one event:**
```ts
type UIEvent =
    | { type: 'setInput'; value: string }
    | { type: 'setSelected'; index: number }
    | { type: 'trigger'; item: Item; trigger: Trigger }
```

Store knows frame type, applies to `query` or `text` accordingly.
