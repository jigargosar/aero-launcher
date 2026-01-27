import {useEffect, useEffectEvent, useRef, useState} from 'react'
import {ListItem, ListMode} from '@shared/types'
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
    const [mode, setMode] = useState<ListMode | null>(null)
    const [query, setQuery] = useState('')
    const [dialogItem, setDialogItem] = useState<ListItem | null>(null)
    const lastKeyTime = useRef(0)
    const shouldScrollRef = useRef(false)

    // Derive state based on mode
    const isNormalMode = mode?.tag === 'normal'
    const isInputMode = mode?.tag === 'input'
    const items = isNormalMode ? mode.items : null
    const selectedIndex = mode?.selectedIndex ?? 0

    // Subscribe to mode and request initial data
    useEffect(() => {
        window.electron.onListMode(setMode)
        window.electron.requestListMode()
    }, [])

    // Send query to store on change
    useEffect(() => {
        window.electron.setQuery(query)
    }, [query])

    const selectedItem = items?.[selectedIndex]

    const executeItem = (item: ListItem) => {
        window.electron.executeItem(item)
    }

    const showItemInfo = (item: ListItem) => {
        setDialogItem(item)
    }

    // Keyboard handler with access to latest state
    const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
        // Input mode handling
        if (isInputMode) {
            switch (e.key) {
                case 'Escape':
                    window.electron.exitInputMode()
                    return
                case 'Enter':
                    window.electron.submitInput()
                    return
            }
            // TODO: handle typing in input mode
            return
        }

        // Normal mode handling
        switch (e.key) {
            case 'Escape':
                if (dialogItem) setDialogItem(null)
                else if (query && config.clearQueryOnEsc) setQuery('')
                else window.electron.hideWindow()
                return
            case 'Enter':
                if (selectedItem) {
                    if (e.shiftKey) showItemInfo(selectedItem)
                    else executeItem(selectedItem)
                }
                return
            case ' ':
                // Space - enter input mode if item supports it
                if (selectedItem?.actions.some(a => a.type === 'input')) {
                    e.preventDefault()
                    window.electron.enterInputMode(selectedItem)
                }
                return
            case 'ArrowDown':
                e.preventDefault()
                shouldScrollRef.current = true
                window.electron.setSelectedIndex(Math.min(selectedIndex + 1, (items?.length ?? 1) - 1))
                return
            case 'ArrowUp':
                e.preventDefault()
                shouldScrollRef.current = true
                window.electron.setSelectedIndex(Math.max(selectedIndex - 1, 0))
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
        selectedIndex,
        executeItem,
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
        executeItem,
        showItemInfo,
        dialogItem,
        closeDialog,
        shouldScrollRef,
    } = useLauncher()

    const loading = mode === null

    // Input mode UI (placeholder for now)
    if (mode?.tag === 'input') {
        return (
            <div className="launcher select-none">
                <header className="launcher-header drag-region">
                    <img className="header-icon" src={mode.item.icon} alt=""/>
                    <span className="header-title">{mode.item.name}</span>
                    <span className="header-query">{mode.text || mode.placeholder}</span>
                </header>
                <div className="empty">Input mode - TODO</div>
            </div>
        )
    }

    // Normal mode UI
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
                    {selectedItem?.name ?? 'Aero Launcher'}
                    {loading && <LoadingBars />}
                </span>
                {!loading && query && <span className="header-query">{query}</span>}
            </header>

            {!loading && items && items.length > 0 && (
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
                            // onMouseEnter={() => window.electron.setSelectedIndex(index)}
                            onClick={(e) => e.shiftKey ? showItemInfo(item) : executeItem(item)}
                        >
                            <img className="item-icon" src={item.icon} alt=""/>
                            <span className="item-name">{item.name}</span>
                            <img className="item-chevron" src={Icons.chevron} alt=""/>
                        </div>
                    ))}
                </div>
            )}
            {!loading && items && items.length === 0 && (
                <div className="empty">No results found</div>
            )}
        </div>
    )
}
