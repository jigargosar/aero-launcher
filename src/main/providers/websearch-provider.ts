import { shell, net } from 'electron'
import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

const GOOGLE_SUGGEST = 'https://suggestqueries.google.com/complete/search?client=chrome&q='
const DDG_SUGGEST = 'https://duckduckgo.com/ac/?q='
const WIKI_SUGGEST = 'https://en.wikipedia.org/w/api.php?action=opensearch&search='
const NPM_SUGGEST = 'https://www.npmjs.com/search/suggestions?q='

type SuggestType = 'google' | 'ddg' | 'wiki' | 'npm'

async function fetchSuggestions(query: string, type: SuggestType = 'google'): Promise<string[]> {
    if (!query.trim()) return []

    try {
        switch (type) {
            case 'google': {
                const response = await net.fetch(GOOGLE_SUGGEST + encodeURIComponent(query))
                const data = await response.json() as [string, string[]]
                return data[1] ?? []
            }
            case 'ddg': {
                const response = await net.fetch(DDG_SUGGEST + encodeURIComponent(query))
                const data = await response.json() as { phrase: string }[]
                return data.map(d => d.phrase)
            }
            case 'wiki': {
                const response = await net.fetch(WIKI_SUGGEST + encodeURIComponent(query))
                const data = await response.json() as [string, string[]]
                return data[1] ?? []
            }
            case 'npm': {
                const response = await net.fetch(NPM_SUGGEST + encodeURIComponent(query))
                const data = await response.json() as { name: string }[]
                return data.map(d => d.name)
            }
        }
    } catch {
        return []
    }
}

const SEARCH_TEMPLATES: Item[] = [
    { id: 'ws-google', name: 'Google Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://google.com/search?q={query}', placeholder: 'Search Google...', suggest: 'google' }, triggers: ['browse'] },
    { id: 'ws-ddg', name: 'DuckDuckGo Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://duckduckgo.com/?q={query}', placeholder: 'Search DuckDuckGo...', suggest: 'ddg' }, triggers: ['browse'] },
    { id: 'ws-youtube', name: 'YouTube Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://youtube.com/results?search_query={query}', placeholder: 'Search YouTube...', suggest: 'google' }, triggers: ['browse'] },
    { id: 'ws-github', name: 'GitHub Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://github.com/search?q={query}', placeholder: 'Search GitHub...', suggest: 'google' }, triggers: ['browse'] },
    { id: 'ws-npm', name: 'npm Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://www.npmjs.com/search?q={query}', placeholder: 'Search npm...', suggest: 'npm' }, triggers: ['browse'] },
    { id: 'ws-so', name: 'Stack Overflow Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://stackoverflow.com/search?q={query}', placeholder: 'Search Stack Overflow...', suggest: 'google' }, triggers: ['browse'] },
    { id: 'ws-mdn', name: 'MDN Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://developer.mozilla.org/en-US/search?q={query}', placeholder: 'Search MDN...', suggest: 'google' }, triggers: ['browse'] },
    { id: 'ws-wiki', name: 'Wikipedia Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://en.wikipedia.org/w/index.php?search={query}', placeholder: 'Search Wikipedia...', suggest: 'wiki' }, triggers: ['browse'] },
    { id: 'ws-reddit', name: 'Reddit Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://www.reddit.com/search/?q={query}', placeholder: 'Search Reddit...', suggest: 'google' }, triggers: ['browse'] },
    { id: 'ws-amazon', name: 'Amazon Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://www.amazon.com/s?k={query}', placeholder: 'Search Amazon...', suggest: 'google' }, triggers: ['browse'] },
    { id: 'ws-maps', name: 'Google Maps Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://www.google.com/maps/search/{query}', placeholder: 'Search Maps...', suggest: 'google' }, triggers: ['browse'] },
]

const WEB_SEARCH_CATEGORY: Item = {
    id: 'ws-category',
    name: 'Web Search',
    icon: Icons.search,
    moduleId: 'websearch',
    metadata: { kind: 'category' },
    triggers: ['browse'],
}

export const websearchProvider: Provider = {
    id: 'websearch',

    getRootItems: () => [WEB_SEARCH_CATEGORY, ...SEARCH_TEMPLATES],

    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string | undefined

        // Category item
        if (kind === 'category') {
            if (trigger.type === 'browse') {
                return { type: 'pushList', items: SEARCH_TEMPLATES }
            }
            return { type: 'noop' }
        }

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
            return { type: 'pushInput', placeholder: item.metadata.placeholder as string }
        }

        if (trigger.type === 'textChange') {
            const query = trigger.text
            if (!query) return { type: 'updateItems', items: [] }

            const urlTemplate = item.metadata.url as string
            const suggestType = (item.metadata.suggest as SuggestType) ?? 'google'
            const suggestions = await fetchSuggestions(query, suggestType)

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
