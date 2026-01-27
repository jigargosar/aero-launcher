import {shell, net} from 'electron'
import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'
import {StoreAPI} from './store'

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

function suggestionToItem(suggestion: string): ListItem {
    return {
        sourceId: 'websearch',
        id: `websearch:suggestion:${suggestion}`,
        name: suggestion,
        icon: Icons.search,
        actions: [{type: 'execute'}]
    }
}

export const WebSearch = {
    id: 'websearch',

    async start(onUpdate: (items: ListItem[]) => void, store: StoreAPI): Promise<void> {
        // Only suggestions reach execute handler (main item has no execute action)
        store.registerExecuteHandler('websearch', (item) => {
            searchGoogle(item.name)
        })

        store.registerInputHandler('websearch', {
            onQuery: async (_item, text, emit) => {
                const suggestions = await fetchSuggestions(text)
                emit(suggestions.map(suggestionToItem))
            },
            onSubmit: (_item, text) => {
                searchGoogle(text)
            }
        })

        onUpdate([
            {
                sourceId: 'websearch',
                id: 'websearch:google',
                name: 'Google Search',
                icon: Icons.search,
                actions: [{type: 'input', placeholder: 'Search Google...'}]
            }
        ])
    }
}
