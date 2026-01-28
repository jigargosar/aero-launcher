import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

const MOCK_WEBSEARCH: Item[] = [
    { id: 'ws-google', name: 'Google Search', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://google.com/search?q={query}' }, triggers: ['browse'] },
    { id: 'ws-ddg', name: 'DuckDuckGo', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://duckduckgo.com/?q={query}' }, triggers: ['browse'] },
    { id: 'ws-youtube', name: 'YouTube', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://youtube.com/results?search_query={query}' }, triggers: ['browse'] },
    { id: 'ws-github', name: 'GitHub', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://github.com/search?q={query}' }, triggers: ['browse'] },
    { id: 'ws-npm', name: 'npm', icon: Icons.search, moduleId: 'websearch', metadata: { url: 'https://www.npmjs.com/search?q={query}' }, triggers: ['browse'] },
]

export const websearchProvider: Provider = {
    id: 'websearch',

    getRootItems: () => MOCK_WEBSEARCH,

    onTrigger: async (item, trigger) => {
        const kind = item.metadata.kind as string | undefined

        // Suggestion item (from text input)
        if (kind === 'suggestion') {
            if (trigger.type === 'execute') {
                console.log(`[websearch] Opening: ${item.metadata.url}`)
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
            const suggestions: Item[] = [
                { id: `${item.id}-s1`, name: query, icon: Icons.search, moduleId: 'websearch', metadata: { kind: 'suggestion', url: urlTemplate.replace('{query}', encodeURIComponent(query)) }, triggers: ['execute'] },
                { id: `${item.id}-s2`, name: `${query} tutorial`, icon: Icons.search, moduleId: 'websearch', metadata: { kind: 'suggestion', url: urlTemplate.replace('{query}', encodeURIComponent(`${query} tutorial`)) }, triggers: ['execute'] },
                { id: `${item.id}-s3`, name: `${query} examples`, icon: Icons.search, moduleId: 'websearch', metadata: { kind: 'suggestion', url: urlTemplate.replace('{query}', encodeURIComponent(`${query} examples`)) }, triggers: ['execute'] },
            ]
            return { type: 'updateItems', items: suggestions }
        }

        return { type: 'noop' }
    },
}
