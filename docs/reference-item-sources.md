Item types a launcher typically serves:

1. Applications - installed apps
2. Commands - built-in actions (quit, settings)
3. Files/Folders - recent files, bookmarks, quick access
4. System actions - shutdown, restart, sleep, lock
5. Clipboard history - recent copies
6. Browser bookmarks - Chrome, Firefox, Edge
7. Calculator - inline math evaluation
8. Unit/Currency converter - `10 usd to eur`
9. Dictionary/Thesaurus - word definitions
10. Web search - `g: query` → Google, `yt: query` → YouTube
11. Shell commands - `> npm run dev`
12. Snippets - text expansion, templates
13. Window switcher - open windows/tabs
14. Contacts - email, call
15. Calendar events - upcoming meetings
16. Notes/Todos - quick capture
17. SSH connections - saved hosts
18. Password manager - 1Password, Bitwarden entries
19. Emoji picker - `:smile:`
20. Color picker - `#ff0000` preview

## Key Observation

Each item type is a source that:

- Has its own async initialization (some instant, some slow)
- May need periodic refresh (clipboard) or be static (apps)
- Has different fetch patterns (one-shot, streaming, on-demand)
- May depend on query prefix (`>`, `g:`, `=`)

The problem isn't just "queue icon fetches" - it's orchestrating multiple async sources with different lifecycles.

## Why This Matters

1. **Scope definition** - Establishes what a launcher *could* be, prevents tunnel vision
2. **Architecture forcing function** - Source diversity (static vs streaming, instant vs slow, prefix-triggered vs always-on) forces flexible design upfront
3. **Prioritization input** - Helps decide what to build first vs later
4. **Pattern extraction** - "List of items" is actually "N async sources with different behaviors"