# Inbox

# Ready

- Header shows selected item, remove parent from UIState
- Decouple Frame from UIState - Split internal/external types
    - UI state/Frame is abhorrently used UI, we need to send proper ViewModel. to remove convoluted code.
- Add breadcrumbs to UIState - Navigation path display

# Next Actions

- Add sourceItems/filteredSourceItems to ListFrame - Fix nested frame filtering bug
- bug/enforcement: input frame only makes sense if it is at top of stack.
- remove duplication, from create root frame. only reason to so is ranking might have changed based on history. we are not refreshing root items.

# Done

# SomeDay/Maybe

- Document Algorithm
- Isolate learning algorithm as generic module (Learned namespace with gap-based boost)
- Persist ranking to disk (load on init, save on change)
- Refactor State with FrameStack (root + rest, strict types)
