import {useEffect, useState} from 'react'
import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'

import LAUNCHBAR_ICON from '@assets/icon.png'

function useLauncher() {
    const [items, setItems] = useState<ListItem[]>([])
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)

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
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(i => Math.max(i - 1, 0))
            } else if (e.key === 'Backspace') {
                setQuery(q => q.slice(0, -1))
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                setQuery(q => q + e.key)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [filteredItems.length])

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
