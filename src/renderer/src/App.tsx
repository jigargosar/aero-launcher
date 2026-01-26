import {useEffect, useEffectEvent, useRef, useState} from 'react'
import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'

import LAUNCHBAR_ICON from '@assets/icon.png'

const config = {
    queryTimeoutMs: 1000,
    clearQueryOnEsc: true,
}

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

function useLauncher() {
    const [items, setItems] = useState<ListItem[] | null>(null)
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const lastKeyTime = useRef(0)

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

    const performPrimaryAction = (item: ListItem) => {
        window.electron.performPrimaryAction(item)
    }

    // Keyboard handler with access to latest state
    const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                if (query && config.clearQueryOnEsc) setQuery('')
                else if (!query) window.electron.hideWindow()
                return
            case 'Enter':
                if (selectedItem) {
                    performPrimaryAction(selectedItem)
                }
                return
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(i => Math.min(i + 1, (items?.length ?? 1) - 1))
                return
            case 'ArrowUp':
                e.preventDefault()
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
        performPrimaryAction,
    }
}

export default function App() {
    const {
        query,
        items,
        selectedItem,
        selectedIndex,
        setSelectedIndex,
        performPrimaryAction,
    } = useLauncher()

    const loading = items === null

    return (
        <div className="launcher">
            <header className={`launcher-header drag-region ${loading ? 'loading' : ''}`}>
                <img
                    className="header-icon"
                    src={selectedItem?.icon ?? LAUNCHBAR_ICON}
                    alt=""
                />
                <span className="header-title">
                    {selectedItem?.name ?? 'Launch Bar'}
                    {loading && <LoadingBars />}
                </span>
                {!loading && query && <span className="header-query">{query}</span>}
            </header>

            {!loading && items.length > 0 && (
                <div className="launcher-list">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className={`item ${index === selectedIndex ? 'selected' : ''}`}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => performPrimaryAction(item)}
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
