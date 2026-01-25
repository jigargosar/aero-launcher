import {useEffect, useState} from 'react'
import {ListItem} from '@shared/types'
import type {CSSProperties} from 'react'

export default function App() {
    const [items, setItems] = useState<ListItem[]>([])

    useEffect(() => {
        window.electron.onListState(setItems)
    }, [])

    return (
        <div
            className="bg-zinc-900 text-zinc-100 min-h-screen p-4"
            style={{WebkitAppRegion: 'drag'} as CSSProperties}
        >
            <h1 className="text-lg font-bold mb-4">Launch Bar v2</h1>
            <div
                className="space-y-2 overflow-auto"
                style={{WebkitAppRegion: 'no-drag'} as CSSProperties}
            >
                {items.map(item => (
                    <div key={item.id} className="p-2 bg-zinc-800 rounded">
                        {item.name}
                    </div>
                ))}
            </div>
        </div>
    )
}
