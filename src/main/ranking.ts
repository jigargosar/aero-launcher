import {pipe} from 'effect'
import * as A from 'effect/Array'
import * as Option from 'effect/Option'
import * as Order from 'effect/Order'
import {Item} from '@shared/types'

// --- Types ---

export type RankingContext = {
    learned: Map<string, Map<string, number>> // query → (itemId → count)
    history: string[] // itemIds ordered by recency, most recent first
}

const MAX_COUNT = 3
const MIN_COUNT_FOR_BOOST = 2
const MAX_HISTORY_SIZE = 50

export function createRankingContext(): RankingContext {
    return {
        learned: new Map(),
        history: []
    }
}

export function recordSelection(context: RankingContext, query: string, itemId: string): void {
    context.history = [itemId, ...context.history.filter(id => id !== itemId)].slice(0, MAX_HISTORY_SIZE)

    if (!query) return

    const q = query.toLowerCase()
    const counts = context.learned.get(q) ?? new Map<string, number>()

    // Find current winner
    let winnerId = ''
    let winnerCount = 0
    for (const [id, count] of counts) {
        if (count > winnerCount) {
            winnerId = id
            winnerCount = count
        }
    }

    // Decrement winner if different from selected
    if (winnerId && winnerId !== itemId) {
        counts.set(winnerId, Math.max(0, winnerCount - 1))
    }

    // Increment selected (max 3)
    counts.set(itemId, Math.min(MAX_COUNT, (counts.get(itemId) ?? 0) + 1))

    context.learned.set(q, counts)
}

type SearchableItem = {
    id: string
    name: string
    segments: string[]
    normalized: string
    item: Item
}

type UnifiedScored = {
    item: SearchableItem
    start: number // first matched segment index (lower = better)
    charSpan: number // total chars in matched segments (lower = better)
    gaps: number // number of skipped segments (lower = better)
}

type Matcher = (
    items: SearchableItem[],
    query: string,
    context: RankingContext
) => SearchableItem[]

// --- Segmentation ---

function toSegments(name: string): string[] {
    return name
        .split(/[\s\-]+/)
        .flatMap(word => word.split(/(?=[A-Z])/))
        .map(s => s.toLowerCase())
        .filter(s => s.length > 0)
}

function toSearchable(item: Item): SearchableItem {
    const segments = toSegments(item.name)
    return {
        id: item.id,
        name: item.name,
        segments,
        normalized: segments.join(''),
        item
    }
}

// --- Unified Matching ---

function matchWithGaps(
    segments: string[],
    query: string,
    startIdx: number
): {start: number; charSpan: number; gaps: number} | null {
    if (startIdx >= segments.length || query.length === 0) return null

    let queryPos = 0
    let segIdx = startIdx
    let segOffset = 0
    let charSpan = 0
    let firstMatchedSeg = -1
    let lastMatchedSeg = -1
    let matchedSegCount = 0

    while (queryPos < query.length) {
        if (segIdx >= segments.length) return null

        const seg = segments[segIdx]

        if (segOffset < seg.length && seg[segOffset] === query[queryPos]) {
            if (segOffset === 0) {
                if (firstMatchedSeg === -1) firstMatchedSeg = segIdx
                lastMatchedSeg = segIdx
                matchedSegCount++
                charSpan += seg.length
            }
            queryPos++
            segOffset++
        } else {
            segIdx++
            segOffset = 0
        }
    }

    const gaps = lastMatchedSeg - firstMatchedSeg + 1 - matchedSegCount
    return {start: firstMatchedSeg, charSpan, gaps}
}

// --- Sorters ---

const byStart: Order.Order<UnifiedScored> = Order.mapInput(
    Order.number,
    (s: UnifiedScored) => s.start
)

const byCharSpan: Order.Order<UnifiedScored> = Order.mapInput(
    Order.number,
    (s: UnifiedScored) => s.charSpan
)

const byGaps: Order.Order<UnifiedScored> = Order.mapInput(
    Order.number,
    (s: UnifiedScored) => s.gaps
)

const byName: Order.Order<UnifiedScored> = Order.mapInput(
    Order.string,
    (s: UnifiedScored) => s.item.name.toLowerCase()
)

const byHistory = (context: RankingContext): Order.Order<UnifiedScored> => {
    const idx = new Map(context.history.map((id, i) => [id, i]))
    return Order.mapInput(Order.number, (s: UnifiedScored) => idx.get(s.item.id) ?? Infinity)
}

// --- Matchers ---

const matchLearned: Matcher = (items, query, context) => {
    const counts = context.learned.get(query)
    if (!counts) return []

    // Find winner (highest count)
    let winnerId = ''
    let winnerCount = 0
    for (const [id, count] of counts) {
        if (count > winnerCount) {
            winnerId = id
            winnerCount = count
        }
    }

    // Only boost if count >= MIN_COUNT_FOR_BOOST
    if (winnerCount < MIN_COUNT_FOR_BOOST) return []

    const item = items.find(si => si.id === winnerId)
    return item ? [item] : []
}

const matchUnified: Matcher = (items, query, context) => {
    const scored = pipe(
        items,
        A.filterMap(si => {
            for (let startIdx = 0; startIdx < si.segments.length; startIdx++) {
                const result = matchWithGaps(si.segments, query, startIdx)
                if (result) {
                    return Option.some({item: si, ...result})
                }
            }
            return Option.none()
        })
    )

    const order = Order.combine(
        byStart,
        Order.combine(
            byCharSpan,
            Order.combine(byGaps, byName)
        )
    )

    return pipe(scored, A.sort(order), A.map(s => s.item))
}

const matchers: Matcher[] = [matchLearned, matchUnified]

// --- Main ---

export function filterAndSort(
    items: Item[],
    query: string,
    context: RankingContext
): Item[] {
    const q = query.toLowerCase()
    const searchables = items.map(toSearchable)

    if (q === '') {
        // Empty query: sort by history then alpha
        const historyIdx = new Map(context.history.map((id, i) => [id, i]))
        const order = Order.combine(
            Order.mapInput(Order.number, (si: SearchableItem) => historyIdx.get(si.id) ?? Infinity),
            Order.mapInput(Order.string, (si: SearchableItem) => si.name.toLowerCase())
        )
        return pipe(searchables, A.sort(order), A.map(si => si.item))
    }

    const {result} = matchers.reduce(
        ({result, remaining}, matcher) => {
            const matched = matcher(remaining, q, context)
            const matchedIds = new Set(matched.map(si => si.id))
            return {
                result: [...result, ...matched],
                remaining: remaining.filter(si => !matchedIds.has(si.id))
            }
        },
        {result: [] as SearchableItem[], remaining: searchables}
    )

    return result.map(si => si.item)
}

// --- Exports for testing ---

export const RankingTesting = {
    toSearchable,
    toSegments,
    matchWithGaps,
    matchLearned,
    matchUnified
}
