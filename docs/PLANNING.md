# Inbox

# Ready

# Next Actions
- simplify apps fetching and icons fetching, including desktop folder. 

# Done
- Implement real app provider (Get-StartApps, icons, caching, async getRootItems)
- Enforce input frame can only be at top of stack (pushList/pushInput check)
- pop return null instead of erroring out. and back clears query when backing out of root with query.
- back, should cleary query on root frame.
- Clear naming of UIEvent and ProviderResponse tags. 
- bug back navigation closes window.
- each escape key should, reset, clear query if exists, then close app. in order.
- Header should always show selected item
- Add sourceItems/filteredSourceItems to ListFrame - Fix nested frame filtering bug
- remove duplication, from create root frame. only reason to so is ranking might have changed based on history. we are
  not refreshing root items.
- ISI, root frame is separate, not part of stack

# SomeDay/Maybe

- Decouple Frame from UIState - Split internal/external types
    - UI state/Frame is abhorrently used UI, we need to send proper ViewModel. to remove convoluted code.
- Add breadcrumbs to UIState - Navigation path display
- Document Algorithm
- Isolate learning algorithm as generic module (Learned namespace with gap-based boost)
- Persist ranking to disk (load on init, save on change)
- ISI: Root frame shouldn't have parent field, nested frames parent shouldn't be optional
- Refresh of index is missing. we fetch root items only once at startup.