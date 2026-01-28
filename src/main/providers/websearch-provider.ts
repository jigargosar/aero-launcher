import { shell, net } from 'electron'
import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

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

const SEARCH_TEMPLATES: Item[] = [
    { id: 'ws-google', name: 'Google Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://google.com/search?q={query}' }, triggers: ['browse'] },
    { id: 'ws-ddg', name: 'DuckDuckGo', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://duckduckgo.com/?q={query}' }, triggers: ['browse'] },
    { id: 'ws-youtube', name: 'YouTube', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://youtube.com/results?search_query={query}' }, triggers: ['browse'] },
    { id: 'ws-github', name: 'GitHub', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://github.com/search?q={query}' }, triggers: ['browse'] },
    { id: 'ws-npm', name: 'npm', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://www.npmjs.com/search?q={query}' }, triggers: ['browse'] },
]

export const websearchProvider: Provider = {
    id: 'websearch',

    getRootItems: () => SEARCH_TEMPLATES,

    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string | undefined

        // Suggestion item (from text input)
        if (kind === 'suggestion') {
            if (trigger.type === 'execute') {
                const url = item.metadata.url as string
                shell.openExternal(url)
                return { type: 'hide' }
            }
            return { type: 'noop' }
        }

        // Search template
        if (trigger.type === 'browse') {
            return { type: 'pushInput', placeholder: `Search ${item.name}...` }
        }

        if (trigger.type === 'textChange') {
            const query = trigger.text
            if (!query) return { type: 'updateItems', items: [] }

            const urlTemplate = item.metadata.url as string
            const suggestions = await fetchSuggestions(query)

            // Raw query as first option
            const rawItem: Item = {
                id: `${item.id}-raw`,
                name: query,
                icon: Icons.search,
                moduleId: 'websearch',
                metadata: {
                    kind: 'suggestion',
                    url: urlTemplate.replace('{query}', encodeURIComponent(query))
                },
                triggers: ['execute']
            }

            // Filter out suggestions that match the raw query
            const filteredSuggestions = suggestions.filter(s => s.toLowerCase() !== query.toLowerCase())

            const suggestionItems: Item[] = filteredSuggestions.map((s, i) => ({
                id: `${item.id}-s${i}`,
                name: s,
                icon: Icons.search,
                moduleId: 'websearch',
                metadata: {
                    kind: 'suggestion',
                    url: urlTemplate.replace('{query}', encodeURIComponent(s))
                },
                triggers: ['execute']
            }))

            return { type: 'updateItems', items: [rawItem, ...suggestionItems] }
        }

        return { type: 'noop' }
    },
}
