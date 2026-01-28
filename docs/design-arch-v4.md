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
