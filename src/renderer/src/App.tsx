import {useEffect, useEffectEvent, useRef, useState} from 'react'
import {ListItem} from '@shared/types'
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
    const [items, setItems] = useState<ListItem[] | null>(null)
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [dialogItem, setDialogItem] = useState<ListItem | null>(null)
    const lastKeyTime = useRef(0)
    const shouldScrollRef = useRef(false)

    // Subscribe to items and request initial data
    useEffect(() => {
        window.electron.onListItemsReceived(setItems)
        window.electron.requestListItems()
    }, [])

    // Send query to store on change
    useEffect(() => {
        window.electron.setQuery(query)
        setSelectedIndex(0)
    }, [query])

    const selectedItem = items?.[selectedIndex]

    const launchItem = (item: ListItem) => {
        window.electron.performPrimaryAction(item)
    }

    const showItemInfo = (item: ListItem) => {
        setDialogItem(item)
    }

    // Keyboard handler with access to latest state
    const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
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
        query,
        items,
        selectedItem,
        selectedIndex,
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

            {!loading && items.length > 0 && (
                <div className="launcher-list">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            // Scroll into view only on keyboard navigation
                            ref={index === selectedIndex ? el => {
                                if (shouldScrollRef.current && el) {
                                    el.scrollIntoView({block: 'nearest'})
                                    shouldScrollRef.current = false
                                }
                            } : undefined}
                            className={`item ${index === selectedIndex ? 'selected' : ''}`}
                            onMouseEnter={() => setSelectedIndex(index)}
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
