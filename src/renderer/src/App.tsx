import {ReactNode, useEffect, useRef, useState} from 'react'
import {ListItem} from '@shared/types'

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
                <div className="header-icon">
                    {selectedItem ? <ItemIcon name={selectedItem.name}/> : <LaunchBarIcon/>}
                </div>
                <span className="header-title">
                    {selectedItem ? selectedItem.name : 'Launch Bar'}
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
                            <div className="item-icon">
                                <ItemIcon name={item.name}/>
                            </div>
                            <span className="item-name">{item.name}</span>
                            <div className="item-chevron">
                                <ChevronIcon/>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty">No results found</div>
            )}
        </div>
    )
}

function ItemIcon({name}: { name: string }) {
    const size = 30
    const icons: Record<string, ReactNode> = {
        'Google Search': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
            </svg>
        ),
        'Calculator': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <rect width="16" height="20" x="4" y="2" rx="2"/>
                <line x1="8" x2="16" y1="6" y2="6"/>
                <line x1="8" x2="8" y1="14" y2="14"/>
                <line x1="8" x2="8" y1="18" y2="18"/>
                <line x1="12" x2="12" y1="14" y2="14"/>
                <line x1="12" x2="12" y1="18" y2="18"/>
                <line x1="16" x2="16" y1="14" y2="18"/>
            </svg>
        ),
        'Calendar': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
        ),
        'Notes': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14,2 14,8 20,8"/>
            </svg>
        ),
        'Settings': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path
                    d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
            </svg>
        ),
        'Terminal': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4,17 10,11 4,5"/>
                <line x1="12" x2="20" y1="19" y2="19"/>
            </svg>
        ),
        'Files': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <path
                    d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            </svg>
        ),
        'Music': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="18" r="4"/>
                <path d="M12 18V2l7 4"/>
            </svg>
        ),
    }

    return icons[name] || (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="m9 12 2 2 4-4"/>
        </svg>
    )
}

function ChevronIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
        </svg>
    )
}

function LaunchBarIcon() {
    return (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d4872e" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
        </svg>
    )
}
