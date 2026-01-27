import {shell, net} from 'electron'
import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'
import {StoreAPI} from './store'

const SUGGEST_URL = 'https://suggestqueries.google.com/complete/search?client=chrome&q='

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
        store.registerExecuteHandler('websearch', (item) => {
            const suggestion = item.metadata?.suggestion
            if (suggestion) {
                shell.openExternal(`https://google.com/search?q=${encodeURIComponent(suggestion)}`)
            } else {
                shell.openExternal('https://google.com')
            }
        })

        store.registerInputHandler('websearch', {
            onQuery: async (_item, text, emit) => {
                const suggestions = await fetchSuggestions(text)
                emit(suggestions.map(s => ({
                    ...suggestionToItem(s),
                    metadata: {suggestion: s}
                })))
            },
            onSubmit: (_item, text) => {
                shell.openExternal(`https://google.com/search?q=${encodeURIComponent(text)}`)
            }
        })

        onUpdate([
            {
                sourceId: 'websearch',
                id: 'websearch:google',
                name: 'Google Search',
                icon: Icons.search,
                actions: [
                    {type: 'execute'},
                    {type: 'input', placeholder: 'Search Google...'}
                ]
            }
        ])
    }
}
