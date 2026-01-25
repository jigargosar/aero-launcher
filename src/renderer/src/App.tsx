import {useEffect, useRef, useState} from 'react'
import {ListItem} from '@shared/types'
import {icons} from '@shared/icons'

import LAUNCHBAR_ICON from '../../../assets/icon.png'

export default function App() {
    const [items, setItems] = useState<ListItem[]>([])
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)
    const mouseY = useRef<number | null>(null)

    useEffect(() => {
        window.electron.onListItemsReceived(setItems)
        window.electron.requestListItems()
    }, [])

    const filteredItems = query
        ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
        : items

    const selectedItem = filteredItems[selectedIndex]

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

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

    return (
        <div className="launcher">
            {/* Header - shows selected item */}
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

            {/* List */}
            {filteredItems.length > 0 ? (
                <div
                    ref={listRef}
                    className="launcher-list"
                    onMouseMove={(e) => {
                        mouseY.current = e.clientY
                    }}
                    onScroll={() => {
                        if (mouseY.current === null || !listRef.current) return
                        const items = listRef.current.querySelectorAll('.item')
                        items.forEach((item, index) => {
                            const rect = item.getBoundingClientRect()
                            if (mouseY.current! >= rect.top && mouseY.current! < rect.bottom) {
                                setSelectedIndex(index)
                            }
                        })
                    }}
                >
                    {filteredItems.map((item, index) => (
                        <div
                            key={item.id}
                            className={`item ${index === selectedIndex ? 'selected' : ''}`}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <img className="item-icon" src={item.icon} alt=""/>
                            <span className="item-name">{item.name}</span>
                            <img className="item-chevron" src={icons.chevron} alt=""/>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty">No results found</div>
            )}
        </div>
    )
}
