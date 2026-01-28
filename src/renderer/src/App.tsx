import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Item, UIState, Trigger } from '@shared/types'
import { Icons } from '@shared/icons'
import { config } from '@shared/config'

import AERO_ICON from '@assets/icon.png'

// === Components ===

function LoadingBars() {
    return (
        <span className="loading-bars">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
        </span>
    )
}

function ItemDialog({ item, onClose }: { item: Item; onClose: () => void }) {
    const rows = [
        ['name', item.name],
        ['id', item.id],
        ['moduleId', item.moduleId],
        ['triggers', item.triggers.join(', ')],
        ...Object.entries(item.metadata),
    ]

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog" onClick={e => e.stopPropagation()}>
                {rows.map(([k, v]) => (
                    <div key={k} className="dialog-row">
                        <span className="dialog-label">{k}</span>
                        <span className="dialog-value">{String(v)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

type ItemListProps = {
    items: Item[]
    selected: number
    onSelect: (index: number) => void
    onExecute: (item: Item) => void
    onShowInfo: (item: Item) => void
    shouldScrollRef: React.RefObject<boolean | null>
}

function ItemList({ items, selected, onSelect, onExecute, onShowInfo, shouldScrollRef }: ItemListProps) {
    if (items.length === 0) return null

    return (
        <div className="launcher-list">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    ref={index === selected ? el => {
                        if (shouldScrollRef.current && el) {
                            el.scrollIntoView({ block: 'nearest' })
                            shouldScrollRef.current = false
                        }
                    } : undefined}
                    className={`item ${index === selected ? 'selected' : ''}`}
                    onMouseEnter={() => onSelect(index)}
                    onClick={e => e.shiftKey ? onShowInfo(item) : onExecute(item)}
                >
                    <img className="item-icon" src={item.icon} alt="" />
                    <span className="item-name">{item.name}</span>
                    {item.triggers.includes('browse') && (
                        <img className="item-chevron" src={Icons.chevron} alt="" />
                    )}
                </div>
            ))}
        </div>
    )
}

type HeaderProps = {
    icon: string
    title: string
    subtitle?: string
    loading?: boolean
}

function Header({ icon, title, subtitle, loading }: HeaderProps) {
    return (
        <header className={`launcher-header drag-region ${loading ? 'loading' : ''}`}>
            <img className="header-icon" src={icon} alt="" />
            <span className="header-title">
                {title}
                {loading && <LoadingBars />}
            </span>
            {subtitle && <span className="header-query">{subtitle}</span>}
        </header>
    )
}

type InputHeaderProps = {
    icon: string
    initialValue: string
    placeholder: string
    onTextChange: (value: string) => void
}

function InputHeader({ icon, initialValue, placeholder, onTextChange }: InputHeaderProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [localValue, setLocalValue] = useState(initialValue)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setLocalValue(newValue)
        onTextChange(newValue)
    }

    return (
        <header className="launcher-header drag-region">
            <img className="header-icon" src={icon} alt="" />
            <input
                ref={inputRef}
                type="text"
                value={localValue}
                placeholder={placeholder}
                onChange={handleChange}
                className="header-input no-drag"
            />
        </header>
    )
}

// === Hook ===

function useLauncher() {
    const [uiState, setUIState] = useState<UIState | null>(null)
    const [dialogItem, setDialogItem] = useState<Item | null>(null)
    const lastKeyTime = useRef(0)
    const shouldScrollRef = useRef<boolean | null>(false)

    useEffect(() => {
        window.electron.onState(setUIState)
        window.electron.requestState()
    }, [])

    const items = uiState?.items ?? []
    const selected = uiState?.selected ?? 0
    const selectedItem = items[selected]

    const sendTrigger = (item: Item, trigger: Trigger) => {
        window.electron.sendEvent({ type: 'trigger', item, trigger })
    }

    const setSelected = (index: number) => {
        window.electron.sendEvent({ type: 'setSelected', index })
    }

    const setQuery = (query: string) => {
        window.electron.sendEvent({ type: 'setQuery', query })
    }

    const setInputText = (text: string) => {
        window.electron.sendEvent({ type: 'setInputText', text })
    }

    const back = () => {
        window.electron.sendEvent({ type: 'back' })
    }

    const reset = () => {
        window.electron.sendEvent({ type: 'reset' })
    }

    const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
        if (!uiState) return

        if (dialogItem) {
            if (e.key === 'Escape') setDialogItem(null)
            return
        }

        switch (e.key) {
            case 'Escape':
                reset()
                return

            case 'ArrowLeft':
                // Let input handle cursor movement
                if (uiState.tag === 'input') return
                e.preventDefault()
                back()
                return

            case 'Enter':
                if (selectedItem) {
                    sendTrigger(selectedItem, { type: e.shiftKey ? 'secondary' : 'execute' })
                }
                return

            case 'ArrowRight':
                // Let input handle cursor movement (unless plain arrow in list)
                if (uiState.tag === 'input') return
                e.preventDefault()
                if (e.ctrlKey) {
                    if (selectedItem?.triggers.includes('actionMenu')) {
                        sendTrigger(selectedItem, { type: 'actionMenu' })
                    }
                } else {
                    if (selectedItem?.triggers.includes('browse')) {
                        sendTrigger(selectedItem, { type: 'browse' })
                    }
                }
                return

            case 'Tab':
                e.preventDefault()
                if (selectedItem?.triggers.includes('sendTo')) {
                    sendTrigger(selectedItem, { type: 'sendTo' })
                }
                return

            case ' ':
                if (selectedItem?.triggers.includes('browse')) {
                    e.preventDefault()
                    sendTrigger(selectedItem, { type: 'browse' })
                    return
                }
                // Fall through to typing if item doesn't support browse
                break

            case 'ArrowDown':
                e.preventDefault()
                shouldScrollRef.current = true
                setSelected(Math.min(selected + 1, items.length - 1))
                return

            case 'ArrowUp':
                e.preventDefault()
                shouldScrollRef.current = true
                setSelected(Math.max(selected - 1, 0))
                return

            case 'Backspace':
                // Input frame handles its own backspace via input element
                if (uiState.tag === 'input') {
                    if (!uiState.text) back()
                    return
                }
                uiState.query ? setQuery(uiState.query.slice(0, -1)) : back()
                return
        }

        // Typing for list frame only (input frame handles via input element)
        if (uiState.tag === 'list' && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            const now = Date.now()
            const shouldReset = now - lastKeyTime.current > config.queryTimeoutMs
            setQuery(shouldReset ? e.key : uiState.query + e.key)
            lastKeyTime.current = now
        }
    })

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    return {
        uiState,
        items,
        selected,
        selectedItem,
        setSelected,
        sendTrigger,
        dialogItem,
        setDialogItem,
        closeDialog: () => setDialogItem(null),
        shouldScrollRef,
    }
}

// === App ===

export default function App() {
    const {
        uiState,
        items,
        selected,
        selectedItem,
        setSelected,
        sendTrigger,
        dialogItem,
        setDialogItem,
        closeDialog,
        shouldScrollRef,
    } = useLauncher()

    const loading = uiState === null

    const headerIcon = (() => {
        if (loading) return AERO_ICON
        if (uiState.parent) return uiState.parent.icon
        return selectedItem?.icon ?? AERO_ICON
    })()

    const headerTitle = (() => {
        if (loading) return 'Aero Launcher'
        if (uiState.parent) return uiState.parent.name
        return selectedItem?.name ?? 'Aero Launcher'
    })()

    const headerSubtitle = (() => {
        if (loading || uiState.tag === 'input') return undefined
        return uiState.query || undefined
    })()

    const emptyMessage = (() => {
        if (uiState?.tag === 'input') return uiState.placeholder
        return 'No results'
    })()

    return (
        <div className="launcher select-none">
            {dialogItem && <ItemDialog item={dialogItem} onClose={closeDialog} />}

            {loading && (
                <Header icon={AERO_ICON} title="Aero Launcher" loading />
            )}

            {!loading && uiState.tag === 'input' && (
                <InputHeader
                    key={uiState.parent.id}
                    icon={uiState.parent.icon}
                    initialValue={uiState.text}
                    placeholder={uiState.placeholder}
                    onTextChange={text => window.electron.sendEvent({ type: 'setInputText', text })}
                />
            )}

            {!loading && uiState.tag === 'list' && (
                <Header
                    icon={headerIcon}
                    title={headerTitle}
                    subtitle={headerSubtitle}
                />
            )}

            {!loading && (
                <ItemList
                    items={items}
                    selected={selected}
                    onSelect={setSelected}
                    onExecute={item => sendTrigger(item, { type: 'execute' })}
                    onShowInfo={setDialogItem}
                    shouldScrollRef={shouldScrollRef}
                />
            )}

            {!loading && items.length === 0 && uiState.tag === 'list' && (
                <div className="empty">{emptyMessage}</div>
            )}
        </div>
    )
}
