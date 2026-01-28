import {ListItem, SimpleSource} from '@shared/types'
import {Icons} from '@shared/icons'
import {clipboard} from 'electron'

const tryEvaluate = (query: string): string | null => {
    // Simple math evaluation - only safe expressions
    if (!/^[\d\s+\-*/().]+$/.test(query)) return null
    try {
        const result = Function(`"use strict"; return (${query})`)()
        if (typeof result === 'number' && !isNaN(result)) {
            return String(result)
        }
    } catch {
        // Invalid expression
    }
    return null
}

export const calculatorSource: SimpleSource = {
    type: 'simple',
    id: 'calculator',

    getItems: (query) => {
        const result = tryEvaluate(query)
        if (result === null) return []
        return [{
            sourceId: 'calculator',
            id: `calculator:${query}`,
            name: `= ${result}`,
            icon: Icons.calculator,
            metadata: {result},
        }]
    },

    execute: (item) => {
        const result = item.metadata?.result
        if (result) {
            clipboard.writeText(result)
            console.log(`[Calculator] Copied: ${result}`)
        }
    },
}
