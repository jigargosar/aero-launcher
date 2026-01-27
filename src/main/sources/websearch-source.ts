import {shell, net} from 'electron'
import {ListItem, WebSearchSource} from '@shared/types'
import {Icons} from '@shared/icons'

const SUGGEST_URL = 'https://suggestqueries.google.com/complete/search?client=chrome&q='

function searchGoogle(query: string) {
    shell.openExternal(`https://google.com/search?q=${encodeURIComponent(query)}`)
}

async function fetchSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return []

    try {
        const response = await net.fetch(SUGGEST_URL + encodeURIComponent(query))
        const data = await response.json() as [string, string[]]
        return data[1] ?? []
    } catch {
        return []
    }
}

export const websearchSource: WebSearchSource = {
    id: 'websearch',

    onStart: (emit) => {
        emit([
            {
                sourceId: 'websearch',
                id: 'websearch:google',
                name: 'Google Search',
                icon: Icons.search,
                metadata: {placeholder: 'Search Google...'}
            }
        ])
    },

    navigate: {
        input: async (context, emit) => {
            const suggestions = await fetchSuggestions(context.text)

            const items: ListItem[] = suggestions.map(s => ({
                sourceId: 'websearch',
                id: `websearch:suggestion:${s}`,
                name: s,
                icon: Icons.search,
            }))

            emit(items)
        }
    },

    handlers: {
        execute: (item) => {
            // For suggestions, search the item name
            // For the main item, this won't be called (Space enters input mode)
            searchGoogle(item.name)
        }
    }
}
