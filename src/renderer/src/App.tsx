import {useEffect, useEffectEvent, useRef, useState} from 'react'
import {LauncherMode, LauncherState, ListItem} from '@shared/types'
import {Icons} from '@shared/icons'
import {config} from '@shared/config'

import AERO_ICON from '@assets/icon.png'

function LoadingBars() {
    return (
        <span className="loading-bars">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
        </span>
    )
}

function ItemDialog({item, onClose}: {item: ListItem; onClose: () => void}) {
    const rows = [
        ['name', item.name],
        ['id', item.id],
        ['sourceId', item.sourceId],
        ...Object.entries(item.metadata ?? {}),
    ]

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog" onClick={e => e.stopPropagation()}>
                {rows.map(([k, v]) => (
                    <div key={k} className="dialog-row">
                        <span className="dialog-label">{k}</span>
                        <span className="dialog-value">{v}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function useLauncher() {
    // Launcher mode items (from indexers)
    const [launcherItems, setLauncherItems] = useState<ListItem[] | null>(null)

    // State from main process (for switcher mode)
    const [mainState, setMainState] = useState<LauncherState | null>(null)

    // Local UI state
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [dialogItem, setDialogItem] = useState<ListItem | null>(null)
    const lastKeyTime = useRef(0)
    const shouldScrollRef = useRef(false)

    // Derive mode and items
    const mode: LauncherMode = mainState?.mode ?? 'launcher'
    const items = mode === 'switcher' ? mainState?.items ?? [] : launcherItems
    const effectiveSelectedIndex = mode === 'switcher' ? (mainState?.selectedIndex ?? 0) : selectedIndex

    // Subscribe to launcher items from indexers
    useEffect(() => {
        window.electron.onListItemsReceived(setLauncherItems)
        window.electron.requestListItems()
    }, [])

    // Subscribe to state from main process
    useEffect(() => {
        window.electron.onLauncherState((state) => {
            setMainState(state)
            shouldScrollRef.current = true
        })
    }, [])

    // Reset to launcher mode when main state is cleared
    useEffect(() => {
        if (mainState === null) {
            setSelectedIndex(0)
        }
    }, [mainState])

    // Send query to store on change (only in launcher mode)
    useEffect(() => {
        if (mode === 'launcher') {
            window.electron.setQuery(query)
            setSelectedIndex(0)
        }
    }, [query, mode])

    const selectedItem = items?.[effectiveSelectedIndex]

    const launchItem = (item: ListItem) => {
        window.electron.performPrimaryAction(item)
        // Reset main state after launching
        setMainState(null)
    }

    const showItemInfo = (item: ListItem) => {
        setDialogItem(item)
    }

    // Keyboard handler
    const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
        // In switcher mode, disable most keyboard handling (hotkey handler controls it)
        if (mode === 'switcher') {
            if (e.key === 'Escape') {
                window.electron.hideWindow()
                setMainState(null)
            }
            return
        }

        switch (e.key) {
            case 'Escape':
                if (dialogItem) setDialogItem(null)
                else if (query && config.clearQueryOnEsc) setQuery('')
                else window.electron.hideWindow()
                return
            case 'Enter':
                if (selectedItem) {
                    if (e.shiftKey) showItemInfo(selectedItem)
                    else launchItem(selectedItem)
                }
                return
            case 'ArrowDown':
                e.preventDefault()
                shouldScrollRef.current = true
                setSelectedIndex(i => Math.min(i + 1, (items?.length ?? 1) - 1))
                return
            case 'ArrowUp':
                e.preventDefault()
                shouldScrollRef.current = true
                setSelectedIndex(i => Math.max(i - 1, 0))
                return
        }

        // Typing (single char, not space, no modifiers)
        if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey) {
            const now = Date.now()
            const shouldReset = now - lastKeyTime.current > config.queryTimeoutMs
            setQuery(shouldReset ? e.key : q => q + e.key)
            lastKeyTime.current = now
        }
    })

    // Keyboard navigation
    useEffect(() => {
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    return {
        mode,
        query,
        items,
        selectedItem,
        selectedIndex: effectiveSelectedIndex,
        setSelectedIndex,
        launchItem,
        showItemInfo,
        dialogItem,
        closeDialog: () => setDialogItem(null),
        shouldScrollRef,
    }
}

export default function App() {
    const {
        mode,
        query,
        items,
        selectedItem,
        selectedIndex,
        setSelectedIndex,
        launchItem,
        showItemInfo,
        dialogItem,
        closeDialog,
        shouldScrollRef,
    } = useLauncher()

    const loading = items === null
    const title = mode === 'switcher' ? 'Switch Windows' : (selectedItem?.name ?? 'Aero Launcher')

    return (
        <div className="launcher select-none">
            {dialogItem && <ItemDialog item={dialogItem} onClose={closeDialog} />}
            <header className={`launcher-header drag-region ${loading ? 'loading' : ''}`}>
                <img
                    className="header-icon"
                    src={selectedItem?.icon ?? AERO_ICON}
                    alt=""
                />
                <span className="header-title">
                    {title}
                    {loading && <LoadingBars />}
                </span>
                {!loading && query && mode === 'launcher' && <span className="header-query">{query}</span>}
            </header>

            {!loading && items.length > 0 && (
                <div className="launcher-list">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            ref={index === selectedIndex ? el => {
                                if (shouldScrollRef.current && el) {
                                    el.scrollIntoView({block: 'nearest'})
                                    shouldScrollRef.current = false
                                }
                            } : undefined}
                            className={`item ${index === selectedIndex ? 'selected' : ''}`}
                            onMouseEnter={() => mode === 'launcher' && setSelectedIndex(index)}
                            onClick={(e) => e.shiftKey ? showItemInfo(item) : launchItem(item)}
                        >
                            <img className="item-icon" src={item.icon} alt=""/>
                            <span className="item-name">{item.name}</span>
                            <img className="item-chevron" src={Icons.chevron} alt=""/>
                        </div>
                    ))}
                </div>
            )}
            {!loading && items.length === 0 && (
                <div className="empty">No results found</div>
            )}
        </div>
    )
}
