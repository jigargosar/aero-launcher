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

    // Subscribe to mode and request initial data
    useEffect(() => {
        window.electron.onListMode(setMode)
        window.electron.requestListMode()
    }, [])

    // Send query to store on change
    useEffect(() => {
        window.electron.setQuery(query)
    }, [query])

    // Unified: derive current list from mode
    const currentItems = mode?.tag === 'input' ? mode.suggestions
                       : mode?.tag === 'normal' ? mode.items
                       : []
    const selectedIndex = mode?.selectedIndex ?? 0
    const selectedItem = currentItems[selectedIndex]

    const executeItem = (item: ListItem) => {
        window.electron.executeItem(item)
    }

    const showItemInfo = (item: ListItem) => {
        setDialogItem(item)
    }

    // Keyboard handler
    const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
        // Arrow keys - unified for all modes
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            shouldScrollRef.current = true
            window.electron.setSelectedIndex(Math.min(selectedIndex + 1, currentItems.length - 1))
            return
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            shouldScrollRef.current = true
            window.electron.setSelectedIndex(Math.max(selectedIndex - 1, 0))
            return
        }

        // Input mode: Escape/Enter only
        if (mode?.tag === 'input') {
            if (e.key === 'Escape') {
                e.preventDefault()
                window.electron.exitInputMode()
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (selectedItem) executeItem(selectedItem)
                else window.electron.submitInput()
            }
            return
        }

        // Normal mode
        if (e.key === 'Escape') {
            if (dialogItem) setDialogItem(null)
            else if (query && config.clearQueryOnEsc) setQuery('')
            else window.electron.hideWindow()
            return
        }
        if (e.key === 'Enter' && selectedItem) {
            if (e.shiftKey) showItemInfo(selectedItem)
            else if (selectedItem.actions.some(a => a.type === 'input')) {
                window.electron.enterInputMode(selectedItem)
            } else {
                executeItem(selectedItem)
            }
            return
        }
        if (e.key === ' ' && selectedItem?.actions.some(a => a.type === 'input')) {
            e.preventDefault()
            window.electron.enterInputMode(selectedItem)
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
        currentItems,
        selectedItem,
        selectedIndex,
        executeItem,
        showItemInfo,
        dialogItem,
        closeDialog: () => setDialogItem(null),
        shouldScrollRef,
    }
}

function ItemList({
    items,
    selectedIndex,
    shouldScrollRef,
    onItemClick,
}: {
    items: ListItem[]
    selectedIndex: number
    shouldScrollRef: React.RefObject<boolean>
    onItemClick: (item: ListItem, e: React.MouseEvent) => void
}) {
    if (items.length === 0) return null

    return (
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
                    onClick={(e) => onItemClick(item, e)}
                >
                    <img className="item-icon" src={item.icon} alt=""/>
                    <span className="item-name">{item.name}</span>
                    <img className="item-chevron" src={Icons.chevron} alt=""/>
                </div>
            ))}
        </div>
    )
}

export default function App() {
    const {
        mode,
        query,
        currentItems,
        selectedItem,
        selectedIndex,
        executeItem,
        showItemInfo,
        dialogItem,
        closeDialog,
        shouldScrollRef,
    } = useLauncher()

    const loading = mode === null

    const handleItemClick = (item: ListItem, e: React.MouseEvent) => {
        if (e.shiftKey) showItemInfo(item)
        else executeItem(item)
    }

    // Input mode UI
    if (mode?.tag === 'input') {
        return (
            <div className="launcher select-none">
                <header className="launcher-header input-mode">
                    <img className="header-icon" src={mode.item.icon} alt=""/>
                    <input
                        className="header-input"
                        type="text"
                        value={mode.text}
                        placeholder={mode.placeholder}
                        onChange={e => window.electron.setInputText(e.target.value)}
                        autoFocus
                    />
                </header>
                <ItemList
                    items={currentItems}
                    selectedIndex={selectedIndex}
                    shouldScrollRef={shouldScrollRef}
                    onItemClick={handleItemClick}
                />
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

            {!loading && (
                currentItems.length > 0
                    ? <ItemList
                        items={currentItems}
                        selectedIndex={selectedIndex}
                        shouldScrollRef={shouldScrollRef}
                        onItemClick={handleItemClick}
                    />
                    : <div className="empty">No results found</div>
            )}
        </div>
    )
}
