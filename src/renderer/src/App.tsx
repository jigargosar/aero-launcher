import { useEffect, useState } from 'react'
import { ListItem } from '@shared/types'

export default function App() {
  const [items, setItems] = useState<ListItem[]>([])

  useEffect(() => {
    window.electron.onListState(setItems)
    window.electron.requestListState()
  }, [])

  return (
    <div
      className="bg-zinc-900 text-zinc-100 min-h-screen p-4"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <h1 className="text-lg font-bold mb-4">Launch Bar v2</h1>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.key}
            className="p-3 bg-zinc-800 rounded"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {item.name}
          </div>
        ))}
      </div>
    </div>
  )
}
