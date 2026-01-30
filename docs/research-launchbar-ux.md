## Input Behavior

1. No visible input box - list-first UI, but first item is special, looks different from list that follows.
2. Typed chars shown subtly at top-right corner
3. Chars persist after timeout (not cleared)
4. Typing after timeout: replaces query
5. Typing within timeout: appends to query
6. Case-insensitive matching (UX always shows CAPS)
7. space and other symbols have special meaning, with some defaults and configurable which focuses scope of typed characters
8. Not sure but pressing space first time, changes first item to input box, for default operation, for e.g. default can be web search query.
9. pressing tab on any selected item, navigates to submenu i.e. shows another context-sensitive list, and first item now shows breadcrumbs subtly, perhaps at top left. tab behavior varies based on item selected
10. for some lists multi select is possible, e.g. select multiple folders, tab then show context-sensitive list, for e.g. delete/move etc.
11. First item always pre-selected
12. Default order: simple history (last-used)
13. No frecency for history - just ordered list
14. 1-3 chars should find correct item
15. Abbreviation learning handles the rest
