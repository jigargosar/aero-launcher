import {ListItem, SimpleSource} from '@shared/types'
import {Icons} from '@shared/icons'
import {clipboard} from 'electron'

// Mock clipboard history
const mockClipboardHistory: string[] = [
    'Hello, world!',
    'const foo = "bar"',
    'https://example.com',
    'Lorem ipsum dolor sit amet',
    'npm install effect',
]

export const clipboardSource: SimpleSource = {
    type: 'simple',
    id: 'clipboard',

    getItems: (query) => {
        let items = mockClipboardHistory.map((text, i) => ({
            sourceId: 'clipboard',
            id: `clipboard:${i}`,
            name: text.length > 50 ? text.slice(0, 50) + '...' : text,
            icon: Icons.clipboard,
            metadata: {fullText: text},
        }))

        if (query) {
            const q = query.toLowerCase()
            items = items.filter(item =>
                item.metadata?.fullText?.toLowerCase().includes(q)
            )
        }

        return items
    },

    execute: (item) => {
        const text = item.metadata?.fullText
        if (text) {
            clipboard.writeText(text)
            console.log(`[Clipboard] Pasted: ${text.slice(0, 30)}...`)
        }
    },
}
