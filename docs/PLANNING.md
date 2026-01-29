# Inbox

# Ready

- Decouple Frame from UIState - Split internal/external types
    - UI state/Frame is abhorrently used UI, we need to send proper ViewModel. to remove convoluted code.
- Add breadcrumbs to UIState - Navigation path display
- bug back navigation closes window.

# Next Actions

- bug/enforcement: input frame only makes sense if it is at top of stack.
- Header should show selected item

# Done

- Add sourceItems/filteredSourceItems to ListFrame - Fix nested frame filtering bug
- remove duplication, from create root frame. only reason to so is ranking might have changed based on history. we are not refreshing root items.
- ISI, root frame is separate, not part of stack

# SomeDay/Maybe

- Document Algorithm
- Isolate learning algorithm as generic module (Learned namespace with gap-based boost)
- Persist ranking to disk (load on init, save on change)
- ISI: Root frame shouldn't have parent field, nested frames parent shouldn't be optional
- Refresh of index is missing. we fetch root items only once at startup.