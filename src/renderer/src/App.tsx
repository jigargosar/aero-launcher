import {useEffect, useEffectEvent, useRef, useState} from 'react'
import {ListItem, UIState} from '@shared/types'
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
    const [uiState, setUIState] = useState<UIState | null>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [dialogItem, setDialogItem] = useState<ListItem | null>(null)
    const lastKeyTime = useRef(0)
    const shouldScrollRef = useRef(false)

    // Subscribe to state and request initial data
    useEffect(() => {
        window.electron.onState(state => {
            setUIState(state)
            setSelectedIndex(0)
        })
        window.electron.requestState()
    }, [])

    const items = uiState?.items ?? []
    const selectedItem = items[selectedIndex]

    const executeItem = (item: ListItem) => {
        window.electron.execute(item)
    }

    const navigateItem = (item: ListItem) => {
        window.electron.navigate(item)
    }

    const showItemInfo = (item: ListItem) => {
        setDialogItem(item)
    }

    // Keyboard handler
    const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
        if (!uiState) return

        switch (e.key) {
            case 'Escape':
                if (dialogItem) setDialogItem(null)
                else window.electron.back()
                return
            case 'Enter':
                if (selectedItem) {
                    if (e.shiftKey) showItemInfo(selectedItem)
                    else executeItem(selectedItem)
                }
                return
            case 'Tab':
                e.preventDefault()
                if (selectedItem) navigateItem(selectedItem)
                return
            case 'ArrowDown':
                e.preventDefault()
                shouldScrollRef.current = true
                setSelectedIndex(i => Math.min(i + 1, items.length - 1))
                return
            case 'ArrowUp':
                e.preventDefault()
                shouldScrollRef.current = true
                setSelectedIndex(i => Math.max(i - 1, 0))
                return
            case 'Backspace':
                if (uiState.tag === 'input') {
                    const newText = uiState.text.slice(0, -1)
                    window.electron.setInputText(newText)
                } else if (uiState.tag === 'root' && uiState.query) {
                    window.electron.setQuery(uiState.query.slice(0, -1))
                }
                return
        }

        // Typing (single char, no modifiers)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            if (uiState.tag === 'input') {
                window.electron.setInputText(uiState.text + e.key)
            } else if (uiState.tag === 'root') {
                const now = Date.now()
                const shouldReset = now - lastKeyTime.current > config.queryTimeoutMs
                const newQuery = shouldReset ? e.key : uiState.query + e.key
                window.electron.setQuery(newQuery)
                lastKeyTime.current = now
            }
        }
    })

    // Keyboard navigation
    useEffect(() => {
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    return {
        uiState,
        items,
        selectedItem,
        selectedIndex,
        setSelectedIndex,
        executeItem,
        navigateItem,
        showItemInfo,
        dialogItem,
        closeDialog: () => setDialogItem(null),
        shouldScrollRef,
    }
}

export default function App() {
    const {
        uiState,
        items,
        selectedItem,
        selectedIndex,
        setSelectedIndex,
        executeItem,
        navigateItem,
        showItemInfo,
        dialogItem,
        closeDialog,
        shouldScrollRef,
    } = useLauncher()

    const loading = uiState === null

    // Header text based on state
    const headerText = (() => {
        if (loading) return 'Aero Launcher'
        switch (uiState.tag) {
            case 'root':
                return selectedItem?.name ?? 'Aero Launcher'
            case 'input':
                return uiState.parent.name
            case 'browse':
                return uiState.path[uiState.path.length - 1]?.name ?? 'Browse'
        }
    })()

    // Query/text display
    const queryText = (() => {
        if (loading) return ''
        switch (uiState.tag) {
            case 'root':
                return uiState.query
            case 'input':
                return uiState.text
            case 'browse':
                return ''
        }
    })()

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
                    {headerText}
                    {loading && <LoadingBars />}
                </span>
                {!loading && queryText && <span className="header-query">{queryText}</span>}
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
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={(e) => e.shiftKey ? showItemInfo(item) : executeItem(item)}
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
