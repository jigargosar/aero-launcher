import {useEffect, useRef, useState} from 'react'
import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'

import LAUNCHBAR_ICON from '@assets/icon.png'

const config = {
    queryTimeoutMs: 1000,
    clearQueryOnEsc: true,
}

function useLauncher() {
    const [items, setItems] = useState<ListItem[]>([])
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const lastKeyTime = useRef(0)

    // Fetch items
    useEffect(() => {
        window.electron.onListItemsReceived(setItems)
        window.electron.requestListItems()
    }, [])

    const filteredItems = query
        ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
        : items

    const selectedItem = filteredItems[selectedIndex]

    // Reset selection on query change
    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now()
            const shouldResetQuery = now - lastKeyTime.current > config.queryTimeoutMs

            if (e.key === 'Escape') {
                if (query) {
                    if (config.clearQueryOnEsc) setQuery('')
                } else {
                    window.electron.hideWindow()
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(i => Math.max(i - 1, 0))
            } else if (e.key === 'Backspace') {
                setQuery(q => q.slice(0, -1))
                lastKeyTime.current = now
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                if (shouldResetQuery) {
                    setQuery(e.key)
                } else {
                    setQuery(q => q + e.key)
                }
                lastKeyTime.current = now
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [filteredItems.length, query])

    return {
        query,
        filteredItems,
        selectedItem,
        selectedIndex,
        setSelectedIndex,
    }
}

export default function App() {
    const {
        query,
        filteredItems,
        selectedItem,
        selectedIndex,
        setSelectedIndex,
    } = useLauncher()

    return (
        <div className="launcher">
            <header className="launcher-header drag-region">
                <img
                    className="header-icon"
                    src={selectedItem?.icon ?? LAUNCHBAR_ICON}
                    alt=""
                />
                <span className="header-title">
                    {selectedItem?.name ?? 'Launch Bar'}
                </span>
                {query && <span className="header-query">{query}</span>}
            </header>

            {filteredItems.length > 0 ? (
                <div className="launcher-list">
                    {filteredItems.map((item, index) => (
                        <div
                            key={item.id}
                            className={`item ${index === selectedIndex ? 'selected' : ''}`}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <img className="item-icon" src={item.icon} alt=""/>
                            <span className="item-name">{item.name}</span>
                            <img className="item-chevron" src={Icons.chevron} alt=""/>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty">No results found</div>
            )}
        </div>
    )
}
