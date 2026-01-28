This document reorganizes the extracted LaunchBar features into logical categories for easier navigation and understanding of related concepts.

---

# Core Concepts & Overview

Introduction to LaunchBar's design philosophy and basic interaction patterns. Start here to understand the foundational concepts before diving into specific features.

## Introduction.html

- What: LaunchBar Help landing page with quick start guide
- Concepts: Cmd-Space to activate, abbreviation input, Return to open, Tab to send, Right arrow to navigate, Space for text input, hold Cmd-Space for Instant Send
- Read when: Understanding basic interaction patterns
- Related: (various linked pages)

---

## GettingStarted-1.html

- What: Introduction page — LaunchBar overview
- Concepts: Cmd-Space to activate, abbreviation search, instant access to apps/docs/contacts/bookmarks
- Read when: Understanding product overview
- Related: (none)

---

## ActionConcepts.html

- What: Single-stage vs multi-stage action patterns (RPN-style input)
- Concepts: Single-stage (action menu, Ctrl-Right Arrow), multi-stage (operands first, then operation), RPN input scheme, Tab key triggers Send-to, auto-determined actions based on item types
- Read when: Understanding action execution patterns, RPN input design
- Related: Actions.html, OpeningItems.html, SendingItems.html, InstantSend.html
- Cross-ref: See [Actions & Execution](#actions--execution) for implementation details

---

## Menu.html

- What: Table of contents / navigation menu structure
- Concepts: Category groupings (Selecting Items, Actions, Configuration, Topics), hierarchical menu structure
- Read when: Understanding documentation structure, implementing navigation
- Related: (all content pages)

---

## UsageExamples.html

- What: Step-by-step workflow examples
- Concepts: File operations (recent docs, browsing, rename, copy/move), category sub-search, web browsing/searching, Terminal interaction
- Read when: Understanding real-world usage patterns
- Related: (various)

---

# Search & Selection

How users find and select items in LaunchBar. The core of the launcher experience — abbreviation search, browsing, sub-search, and various selection methods.

## AbbreviationSearch.html

- What: Fuzzy matching — type character sequences to find items by name
- Concepts: AASv4 algorithm (adaptive abbreviation search), character order matching (not contiguous), usage-based learning, abbreviation training, Cmd-Opt-A custom assignment, retype delay (0.7s), `~` for home, `/` for root
- Read when: Implementing search/matching, understanding adaptive learning, custom abbreviation binding
- Related: SelectingItems.html, Subsearch.html, AliasNames.html, Browsing.html
- Cross-ref: Core search algorithm; see [Subsearch](#subsearchhtml) for scoped search

---

## SelectingItems.html

- What: Overview of all methods to select items in LaunchBar
- Concepts: Abbreviation search, sub-search, app switching (Cmd-Space-Space), browsing (arrows), recent docs (Right arrow on app), Cmd-L for URLs, Cmd-G for Finder selection, Cmd-V/Cmd-Shift-V for clipboard, drag, Instant Send, "Speak selected item" option
- Read when: Understanding item selection patterns
- Related: AbbreviationSearch.html, Subsearch.html, Browsing.html, ApplicationSwitching.html, RecentItems.html, EnteringURLs.html, DragAndDrop.html
- Cross-ref: Comprehensive selection overview; links to all selection methods

---

## Subsearch.html

- What: Search within a selected collection (folder, category, playlist)
- Concepts: Space or Right arrow starts sub-search, blue text indicates sub-search mode, multiple sub-searches allowed, Escape to exit, works on folders, apps, categories, playlists, albums, indexing rules
- Read when: Implementing scoped/nested search
- Related: SelectingItems.html, AbbreviationSearch.html, Browsing.html, Categories.html
- Cross-ref: Enables drilling down; see [Categories](#categorieshtml) for item groupings

---

## Browsing.html

- What: Navigate hierarchical content with arrow keys
- Concepts: Left/right arrows for navigation, file system browsing, Option+arrow for hidden files, Shift-Space for deep sub-search, text file content browsing, plist browsing, URL domain browsing, email domain browsing, Control key navigation (emacs/vi style)
- Read when: Implementing hierarchical navigation, understanding browse-able item types
- Related: SelectingItems.html, AbbreviationSearch.html, Subsearch.html
- Cross-ref: Alternative to search; see [WorkingWithFiles](#workingwithfileshtml) for file browsing

---

## Categories.html

- What: Auto-grouped items by kind for scoped searching
- Concepts: Categories indexing rule, sub-search within category (Space), no own indexing (view on existing index), Company/Department/Job Title categories for contacts
- Read when: Implementing item categorization, scoped search
- Related: Configuration.html, SelectingItems.html, AbbreviationSearch.html, Subsearch.html, Browsing.html
- Cross-ref: Virtual groupings; enables [Subsearch](#subsearchhtml) by type

---

## RecentItems.html

- What: Access recently used items via LaunchBar
- Concepts: Cmd-B for recent items list, Cmd-Space + hold Cmd + Down Arrow, scroll wheel access, Right arrow on app shows recent docs (Cocoa apps only)
- Read when: Implementing recent items tracking
- Related: SelectingItems.html, AbbreviationSearch.html, Browsing.html, ApplicationSwitching.html
- Cross-ref: History-based selection; complements [AbbreviationSearch](#abbreviationsearchhtml)

---

## ApplicationSwitching.html

- What: Switch between running apps using Cmd-Space-Space or Cmd-R
- Concepts: Cmd-Space-Space (hold Cmd, repeat Space), auto-activation (orange icon), Cmd-R for running apps list, Cmd-Q/H/Opt-F to quit/hide/force quit, scroll wheel navigation, most-recent-first ordering
- Read when: Implementing app switching, understanding auto-activation pattern
- Related: SelectingItems.html, AbbreviationSearch.html, RecentItems.html, Browsing.html
- Cross-ref: Quick access to running apps; see [RecentItems](#recentitemshtml) for history

---

# Actions & Execution

What happens after selecting an item. Opening, sending, instant operations, and the action system.

## Actions.html

- What: Overview of actions available after selecting an item
- Concepts: Return to open, Quick Look (Cmd-Y/Space), Cmd-Return to reveal, Tab to send, Cmd-D for Finder drop, Cmd-I for Get Info, Cmd-T for Terminal, action menu (click/right-click), LaunchBar menu (gear icon)
- Read when: Understanding available item actions, action menu structure
- Related: OpeningItems.html, SendingItems.html, InstantOpen.html, InstantSend.html, Browsing.html, DragAndDrop.html, CopyAndPaste.html, PerformingWebSearches.html, DialingPhoneNumbers.html, RunningAppleScripts.html, RunningUnixExecutables.html
- Cross-ref: Action hub; see specific action pages for details

---

## OpeningItems.html

- What: Comprehensive guide to opening different item types
- Concepts: Return to open, Opt+open hides others, Cmd-Return reveals in Finder, Shift-Return alternate action, Ctrl-Return opens folder contents, item-specific behaviors (files, folders, disk images, bookmarks, contacts, emails, phones, scripts, user accounts)
- Read when: Implementing open behaviors for different item types
- Related: Actions.html, SendingItems.html, InstantOpen.html, DragAndDrop.html, CopyAndPaste.html, DialingPhoneNumbers.html
- Cross-ref: Default action; see [SendingItems](#sendingitemshtml) for passing to targets

---

## SendingItems.html

- What: Send items to targets (apps, scripts, folders, contacts) via Tab
- Concepts: Tab triggers Send-to, default shows suitable apps, file operations with modifiers (Cmd-Return=Move, Opt-Return=Copy), email attachments to contacts, AppleScript open()/handle_string() handlers
- Read when: Implementing send-to flow, file operations
- Related: Actions.html, OpeningItems.html, InstantOpen.html, InstantSend.html, RunningAppleScripts.html, RunningUnixExecutables.html, DialingPhoneNumbers.html, DragAndDrop.html, Browsing.html
- Cross-ref: Core action pattern; enables item→target operations

---

## InstantOpen.html

- What: Open items by holding last abbreviation key (no Return needed)
- Concepts: Hold last key to open instantly, Delay Until Repeat setting, combine with sub-search, Instant-Open Folders option for browsing vs Finder
- Read when: Implementing instant activation, reducing keystrokes
- Related: OpeningItems.html, SendingItems.html, InstantSend.html
- Cross-ref: Speed optimization; pairs with [InstantSend](#instantsendhtml)

---

## InstantSend.html

- What: Send files or text from other apps to LaunchBar for further action
- Concepts: Hold Cmd-Space to trigger, modifier tap alternative, orange "waiting for target" indicator, combine with Instant Open for 2-keystroke operations, drag to Dock icon
- Read when: Implementing input capture from external apps, send-to-target flow
- Related: OpeningItems.html, SendingItems.html, InstantOpen.html
- Cross-ref: External input capture; enables cross-app workflows

---

# Input & Interaction

Keyboard shortcuts, modifier keys, clipboard, drag-drop, and text input methods.

## KeyboardShortcuts.html

- What: System-wide keyboard shortcuts configuration
- Concepts: Cmd-Space default (conflicts with Spotlight/Adobe), Cmd-Space-Space for app switching, hold for Instant Send, configurable in Preferences
- Read when: Understanding shortcut architecture, conflict resolution
- Related: ModifierTaps.html, InstantSend.html, ApplicationSwitching.html
- Cross-ref: Primary activation; see [ModifierTaps](#modifiertapshtml) for alternative

---

## ModifierTaps.html

- What: Activate LaunchBar by tapping modifier keys
- Concepts: Single/double tap options, Shift/Control/Option/Command/fn keys, faster than shortcuts, Search in LaunchBar tap, Instant Send tap
- Read when: Implementing modifier tap activation
- Related: KeyboardShortcuts.html, InstantSend.html
- Cross-ref: Alternative to [KeyboardShortcuts](#keyboardshortcutshtml)

---

## CopyAndPaste.html

- What: Copy paths/addresses and paste to perform actions
- Concepts: Cmd-C copies path/URL, Cmd-Opt-C copies file contents, Cmd-Shift-C copy-and-paste to frontmost app, Cmd-V paste triggers drop action, Cmd-Shift-V select from clipboard (recognizes URLs, paths, text)
- Read when: Implementing clipboard interactions, path/URL handling
- Related: Actions.html, AbbreviationSearch.html, Browsing.html, DragAndDrop.html
- Cross-ref: Clipboard integration; see [ClipboardHistory](#clipboardhistoryhtml) for history

---

## DragAndDrop.html

- What: Drag items onto LaunchBar or from LaunchBar to other apps
- Concepts: Modifier keys during drag (Cmd=Move, Opt=Copy, Shift=Select), default actions configurable, Cmd-G gets Finder selection, Cmd-D drops Finder selection, drag from icon to prevent accidental moves
- Read when: Implementing drag-drop interactions, file operation modifiers
- Related: Actions.html, AbbreviationSearch.html, Browsing.html, CopyAndPaste.html
- Cross-ref: Mouse-based input; complements keyboard methods

---

## TextItems.html

- What: Handle plain text as selectable items
- Concepts: Instant Send creates text items, drag text onto LaunchBar, Cmd-Shift-V from clipboard, browse text file contents, "Enter Text" action, Space to edit, Return for large type, Tab to send
- Read when: Implementing text item handling
- Related: SelectingItems.html, SendingItems.html, InstantSend.html
- Cross-ref: Text as first-class item; enables text→action workflows

---

## EnteringURLs.html

- What: Enter web addresses directly by typing (auto-completes)
- Concepts: Cmd-L or type dot to enter URL, auto-complete (.apple→apple.com), Tab to choose browser, Cmd-Return to select without opening
- Read when: Implementing URL input, auto-completion
- Related: SelectingItems.html, SendingItems.html, WebBrowsers.html, SearchTemplates.html
- Cross-ref: Direct URL entry; see [WebBrowsers](#webbrowsershtml) for bookmarks

---

# Data Sources & Indexing

Where items come from. Configuration of indexing rules and data sources.

## Configuration.html

- What: Overview of LaunchBar configuration via indexing rules
- Concepts: Index of items, indexing rules, index window (Cmd-Opt-I), no manual configuration needed by default
- Read when: Understanding configuration architecture
- Related: IndexWindow.html, IndexingRules.html, AliasNames.html, AbbreviationSearch.html
- Cross-ref: Config overview; see [IndexingRules](#indexingruleshtml) for rule types

---

## ConfigurationConcepts.html

- What: Philosophy of index scoping — exclude irrelevant items
- Concepts: Limited index for better search quality, don't index entire disk, browsing as alternative to indexing everything
- Read when: Understanding index design philosophy
- Related: Configuration.html, Browsing.html
- Cross-ref: Design rationale for selective indexing

---

## IndexingRules.html

- What: Comprehensive list of all indexing rule types
- Concepts: Categories, Applications (Spotlight option), Actions (built-in + custom), Workflows, Services, Snippets, Dock, Preference Panes, Mounted Volumes, Network Locations, User Accounts, Contacts, Calendars, iTunes Library (Best Of Lists), iPhoto, Web Bookmarks/History, 1Password, Cyberduck, Tower repos, Development Resources, iCloud, Files/Folders, Search Templates, Custom Lists
- Read when: Understanding available data sources, implementing new source types
- Related: Configuration.html, IndexWindow.html
- Cross-ref: Master list of sources; reference for implementing sources

---

## IndexWindow.html

- What: Manage indexing rules and index contents
- Concepts: Cmd-Opt-I to open, sidebar lists rules, Options/Index/Schedule panes, drag folder to create rule, sub-search-only option, alias naming in Index pane, schedule (manual/periodic/automatic)
- Read when: Implementing index management UI
- Related: Configuration.html, IndexingRules.html, AliasNames.html
- Cross-ref: Config UI; see [AliasNames](#aliasnameshtml) for custom naming

---

## AliasNames.html

- What: Rename index items with custom names for better abbreviation matching
- Concepts: Alias names (blue text in index), longer names preferred over shortcuts, double-click to edit in Index pane, Cmd-Shift-I to locate item
- Read when: Implementing custom naming/aliasing for items
- Related: Configuration.html, AbbreviationSearch.html
- Cross-ref: Custom naming; improves [AbbreviationSearch](#abbreviationsearchhtml) matching

---

## FilesAndFolders.html

- What: Files and Folders indexing rule configuration
- Concepts: Search scope (subfolder depth), file type collections, skip subfolders (wildcards), exclude items, search package contents option
- Read when: Implementing file indexing options, configuring file sources
- Related: WorkingWithFiles.html, Browsing.html, Configuration.html, AliasNames.html
- Cross-ref: File source config; see [WorkingWithFiles](#workingwithfileshtml) for operations

---

## Contacts.html

- What: Index contacts from various address book apps
- Concepts: OS X Contacts support, Entourage/Eudora support, custom address book files (HTML, ASCII lists), real name prefix for emails, contact groups
- Read when: Implementing contact sources, understanding contact data formats
- Related: WorkingWithContacts.html, Configuration.html, AliasNames.html
- Cross-ref: Contact source; see [WorkingWithContacts](#workingwithcontactshtml) for actions

---

## WebBrowsers.html

- What: Index bookmarks and history from various browsers
- Concepts: Supported browsers (Safari, Firefox, Chrome, Opera, etc.), HTML bookmark files, hostname search option, history indexing with scope limits
- Read when: Implementing browser data sources
- Related: Configuration.html, AliasNames.html, SearchTemplates.html, EnteringURLs.html
- Cross-ref: Browser data source; see [SearchTemplates](#searchtemplateshtml) for web search

---

# File Operations

Working with files and folders — browsing, moving, copying, renaming, and other file actions.

## WorkingWithFiles.html

- What: Comprehensive file operations guide
- Concepts: Search by name (requires indexing), search by kind (categories), browsing, Cmd-G/Cmd-D for Finder selection, Cmd-A selects all in folder, ClipMerge for multi-select, move/copy via Tab or Cmd-V, file content search (Cmd-F), Cmd-Shift-R rename, Shift-Space append text, Cmd-Shift-N new folder, Cmd-E eject
- Read when: Implementing file operations, multi-selection
- Related: FilesAndFolders.html, Browsing.html, CopyAndPaste.html, DragAndDrop.html
- Cross-ref: File operations hub; comprehensive file handling guide

---

# Built-in Tools

Calculator, clipboard history, snippets, and other built-in utilities.

## Calculator.html

- What: Built-in calculator for numeric expressions with math functions
- Concepts: Smart input (omit operators, `x` for `*`), function shortcuts (S→sin, Q→sqrt, L→ln), auto decimal detection, Instant Calculate via Instant Send, `a` placeholder for previous result, AppleScript invocation, x-launchbar:calculate URL, Search Templates for formulas
- Read when: Implementing calculator features, expression parsing, external invocation
- Related: InstantOpen.html, InstantSend.html, CopyAndPaste.html
- Cross-ref: Built-in tool; see [URLCommands](#urlcommandshtml) for external invocation

---

## ClipboardHistory.html

- What: Preserve recent clipboard contents for later reuse
- Concepts: Configurable shortcuts, auto-activation mode, LIFO paste-and-remove, default action (Copy/Paste/Copy+Paste), plain text option, ClipMerge (Cmd-C-C to merge), multiple file selection via ClipMerge, Delete to remove items
- Read when: Implementing clipboard history, ClipMerge multi-copy pattern
- Related: CopyAndPaste.html
- Cross-ref: Clipboard utility; ClipMerge enables multi-file selection

---

## Snippets.html

- What: Quick text insertion with optional placeholders
- Concepts: Snippets folder (~/.../LaunchBar/Snippets), Add Snippet action, Cmd-N to create, Return to insert, placeholders (<date>, <time>, <clipboard>, <|> for cursor), keyboard shortcut access, Cmd-Shift-R to rename
- Read when: Implementing text snippet system, placeholder expansion
- Related: (none listed)
- Cross-ref: Text expansion; placeholder system for dynamic content

---

## SpotlightSearches.html

- What: Smart Spotlight search with simplified syntax
- Concepts: Cmd-Shift-F or dedicated shortcut, smart preprocessing (image rose → kind:image rose), date/kind shortcuts (today, todo, folder), quotes for literal search
- Read when: Implementing Spotlight integration, query preprocessing
- Related: (none listed)
- Cross-ref: System search integration; query preprocessing patterns

---

# Web & Search Templates

URL handling, web searches, and search template system.

## SearchTemplates.html

- What: URL templates with wildcards for web searches
- Concepts: `*` or `%s` as wildcard, UTF-8 encoding option, POST prefix for form submissions, factory templates restorable
- Read when: Implementing search template system
- Related: Configuration.html, PerformingWebSearches.html, URLCommands.html
- Cross-ref: Template system; see [PerformingWebSearches](#performingwebsearcheshtml) for usage

---

## PerformingWebSearches.html

- What: Use search templates to search the web
- Concepts: Select template + Space + query, remembered search strings, Shift-Space for cross-template reuse, Shift-Return repeats last search, Instant Send for selected text
- Read when: Implementing web search integration
- Related: Actions.html, SearchTemplates.html, EnteringURLs.html, RunningAppleScripts.html
- Cross-ref: Web search workflow; uses [SearchTemplates](#searchtemplateshtml)

---

## URLCommands.html

- What: x-launchbar: URL scheme for external invocation
- Concepts: large-type command, select command (file/url/string/abbreviation), execute command (run scripts via search templates), calculate command, hide command
- Read when: Implementing external API, URL scheme handling
- Related: SearchTemplates.html, Calculator.html
- Cross-ref: External API; enables automation and inter-app communication

---

# Scripts & Automation

Running scripts, workflows, and extending LaunchBar functionality.

## RunningAppleScripts.html

- What: Execute AppleScripts from LaunchBar with optional parameters
- Concepts: Return runs script, Shift-Return opens in editor, handle_string() for text params, open() for files, Space to enter params, Opt-Return for background execution
- Read when: Implementing script execution, parameter passing
- Related: Actions.html, SendingItems.html, RunningUnixExecutables.html, DragAndDrop.html
- Cross-ref: Script execution; see [Workflows](#workflowshtml) for Automator

---

## RunningUnixExecutables.html

- What: Execute Unix commands and shell scripts from LaunchBar
- Concepts: Return runs in Terminal, Opt-Return runs in background, Space to enter params, Tab to send file as argument, shebang line required, chmod +x needed
- Read when: Implementing command execution, parameter passing
- Related: Actions.html, SendingItems.html, RunningAppleScripts.html, DragAndDrop.html
- Cross-ref: Command execution; similar patterns to [RunningAppleScripts](#runningapplescriptshtml)

---

## Workflows.html

- What: Run Automator Service workflows from LaunchBar with input/output
- Concepts: Service workflow creation in Automator, input types (text/files/none), Return+Space for text input, Tab to send files, Automator actions (Send to LaunchBar, Display in Large Type, Paste in Frontmost App, Perform Action, Browse), result formats (strings, paths, URLs, PLIST/XML/JSON with title/subtitle/icon), .lbext sharing
- Read when: Implementing extensibility, action-result patterns, structured results
- Related: Actions.html, Services.html, SendingItems.html, InstantSend.html
- Cross-ref: Extensibility system; structured result patterns

---

## Services.html

- What: Invoke OS X Services menu commands from LaunchBar
- Concepts: Services indexing rule, Space to enter text input, Tab to send selection, services without input return results, operates on LaunchBar selection (not other apps)
- Read when: Implementing Services integration
- Related: Actions.html, Workflows.html, SendingItems.html, InstantSend.html
- Cross-ref: System services; see [Workflows](#workflowshtml) for custom automation

---

# App Integrations

Integration with specific applications — calendars, contacts, iTunes, phone dialing.

## WorkingWithCalendars.html

- What: Create calendar events and reminders from LaunchBar
- Concepts: Select calendar + Space, event syntax (description @ date @ location), reminder syntax (description > date), date formats (today, tomorrow, Mon, Apr 4), duration (3-5pm, 2h, 3d), alerts (!15m before), priority (!!), Cmd-Return to open in Calendar
- Read when: Implementing natural language event/reminder creation
- Related: IndexingRules.html
- Cross-ref: Calendar integration; natural language date parsing

---

## WorkingWithContacts.html

- What: Search contacts and create emails/messages
- Concepts: Search by name (forward/reverse), nickname search, Company/Job Title categories, preferred email address, Shift-Return opens first detail, Tab+contact sends file as attachment, Cmd-Ctrl-Return for Google Maps
- Read when: Implementing contact search and actions
- Related: Contacts.html
- Cross-ref: Contact actions; see [Contacts](#contactshtml) for data source

---

## WorkingWith_iTunes.html

- What: Control iTunes playback and browse music library
- Concepts: Playback actions (Play/Pause, Next/Previous, Fast Forward), play from album vs single song, browse library (artists, albums, genres), iTunes DJ commands (Shift-Return variations), Best Of Lists (4+ star songs), primary artist option, Ctrl-Return opens iTunes, Cmd-Ctrl-Return reveals in iTunes
- Read when: Implementing media control, library browsing
- Related: IndexingRules.html, Browsing.html, Subsearch.html
- Cross-ref: Media integration; browse patterns similar to [Browsing](#browsinghtml)

---

## DialingPhoneNumbers.html

- What: Display phone numbers in large type or dial via AppleScript
- Concepts: Default action shows large type, custom AppleScript for dialing (Skype, Dialectic), handle_string() handler receives tel: URL, Shift-Return for large type override
- Read when: Implementing phone number actions, AppleScript integration for calling
- Related: Actions.html, OpeningItems.html, SendingItems.html, DragAndDrop.html, CopyAndPaste.html, RunningAppleScripts.html
- Cross-ref: Phone action; script-based extensibility pattern

---

# UI & Preferences

Application settings, tips, and miscellaneous features.

## TipsAndTricks.html

- What: Miscellaneous tips (autostart, Dock icon, hiding)
- Concepts: Login Items for autostart, Hide Dock Icon (background app mode), Escape/Cmd-Period/Cmd-W to hide, Cmd-Shift-H prevents hiding (lock icon), Cmd+drag to move window
- Read when: Implementing app preferences, window management
- Related: (none listed)
- Cross-ref: App behavior settings

---

## OtherFeatures.html

- What: Miscellaneous features (Dictionary, Text Clips, Terminal)
- Concepts: Dictionary lookup (Space on app), .clip.txt/.clip.rtf text clips, Cmd-T opens Terminal for folder, Cmd-Opt-T runs command in folder, Cmd-Shift-T runs command with file, Send to LaunchBar service
- Read when: Implementing auxiliary features
- Related: (various)
- Cross-ref: Miscellaneous utilities; Terminal integration
