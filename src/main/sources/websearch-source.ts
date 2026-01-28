import {ListItem, InputableSource} from '@shared/types'
import {Icons} from '@shared/icons'
import {shell} from 'electron'

// Mock suggestions
const mockSuggestions = (text: string): string[] => {
    if (!text) return []
    return [
        `${text}`,
        `${text} tutorial`,
        `${text} examples`,
        `${text} documentation`,
    ]
}

export const websearchSource: InputableSource = {
    type: 'inputable',
    id: 'websearch',

    getItems: (_query) => {
        // Always show Google Search entry point
        return [{
            sourceId: 'websearch',
            id: 'websearch:google',
            name: 'Google Search',
            icon: Icons.search,
            metadata: {placeholder: 'Search Google...'},
        }]
    },

    getInputItems: (parent, text, emit) => {
        // Simulate async suggestions
        setTimeout(() => {
            const suggestions = mockSuggestions(text)
            const items: ListItem[] = suggestions.map(s => ({
                sourceId: 'websearch',
                id: `websearch:suggestion:${s}`,
                name: s,
                icon: Icons.search,
            }))
            emit(items)
        }, 100)
    },

    execute: (item) => {
        const query = item.name
        console.log(`[WebSearch] Searching: ${query}`)
        shell.openExternal(`https://google.com/search?q=${encodeURIComponent(query)}`)
    },
}
