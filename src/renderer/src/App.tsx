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
    const [state, setState] = useState<UIState | null>(null)
    const [dialogItem, setDialogItem] = useState<ListItem | null>(null)
    const lastKeyTime = useRef(0)
    const shouldScrollRef = useRef(false)

    // Subscribe to state and request initial data
    useEffect(() => {
        window.electron.onState(setState)
        window.electron.requestState()
    }, [])

    // Derive current list from state
    const currentItems = state?.items ?? []
    const selectedIndex = state?.selectedIndex ?? 0
    const selectedItem = currentItems[selectedIndex]
    const filterQuery = state?.tag === 'root' ? state.filterQuery : ''

    const executeItem = (item: ListItem) => {
        window.electron.execute(item)
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

        // Input mode
        if (state?.tag === 'input') {
            if (e.key === 'Escape') {
                e.preventDefault()
                window.electron.back()
            } else if (e.key === 'Enter' && selectedItem) {
                e.preventDefault()
                executeItem(selectedItem)
            }
            return
        }

        // Root mode
        if (e.key === 'Escape') {
            if (dialogItem) setDialogItem(null)
            else if (filterQuery && config.clearQueryOnEsc) {
                window.electron.setFilterQuery('')
            }
            else window.electron.hideWindow()
            return
        }
        if (e.key === 'Enter' && selectedItem) {
            if (e.shiftKey) showItemInfo(selectedItem)
            else executeItem(selectedItem)
            return
        }
        if (e.key === ' ' && selectedItem) {
            e.preventDefault()
            window.electron.navigate('input', selectedItem)
            return
        }

        // Typing (single char, not space, no modifiers)
        if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey) {
            const now = Date.now()
            const shouldReset = now - lastKeyTime.current > config.queryTimeoutMs
            const newQuery = shouldReset ? e.key : filterQuery + e.key
            window.electron.setFilterQuery(newQuery)
            lastKeyTime.current = now
        }
    })

    // Keyboard navigation
    useEffect(() => {
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    return {
        state,
        filterQuery,
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
        state,
        filterQuery,
        currentItems,
        selectedItem,
        selectedIndex,
        executeItem,
        showItemInfo,
        dialogItem,
        closeDialog,
        shouldScrollRef,
    } = useLauncher()

    const loading = state === null

    const handleItemClick = (item: ListItem, e: React.MouseEvent) => {
        if (e.shiftKey) showItemInfo(item)
        else executeItem(item)
    }

    // Input mode UI
    if (state?.tag === 'input') {
        return (
            <div className="launcher select-none">
                <header className="launcher-header input-mode">
                    <img className="header-icon" src={state.parent.icon} alt=""/>
                    <input
                        className="header-input"
                        type="text"
                        value={state.text}
                        placeholder={state.placeholder}
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

    // Root mode UI
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
                {!loading && filterQuery && <span className="header-query">{filterQuery}</span>}
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
