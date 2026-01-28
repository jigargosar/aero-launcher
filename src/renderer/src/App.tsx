import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Item, UIState, Trigger } from '@shared/types'
import { Icons } from '@shared/icons'
import { config } from '@shared/config'

import AERO_ICON from '@assets/icon.png'

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

function useLauncher() {
    const [uiState, setUIState] = useState<UIState | null>(null)
    const [dialogItem, setDialogItem] = useState<Item | null>(null)
    const lastKeyTime = useRef(0)
    const shouldScrollRef = useRef(false)

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

    const setInput = (value: string) => {
        window.electron.sendEvent({ type: 'setInput', value })
    }

    const back = () => {
        window.electron.sendEvent({ type: 'back' })
    }

    const reset = () => {
        window.electron.sendEvent({ type: 'reset' })
    }

    // Keyboard handler
    const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
        if (!uiState) return

        // Close dialog on Escape
        if (dialogItem) {
            if (e.key === 'Escape') setDialogItem(null)
            return
        }

        switch (e.key) {
            case 'Escape':
                reset()
                return

            case 'ArrowLeft':
                e.preventDefault()
                back()
                return

            case 'Enter':
                if (selectedItem) {
                    if (e.shiftKey) {
                        sendTrigger(selectedItem, { type: 'secondary' })
                    } else {
                        sendTrigger(selectedItem, { type: 'execute' })
                    }
                }
                return

            case 'ArrowRight':
                e.preventDefault()
                if (selectedItem && selectedItem.triggers.includes('browse')) {
                    sendTrigger(selectedItem, { type: 'browse' })
                }
                return

            case 'Tab':
                e.preventDefault()
                if (selectedItem && selectedItem.triggers.includes('sendTo')) {
                    sendTrigger(selectedItem, { type: 'sendTo' })
                }
                return

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

            case 'Backspace': {
                const currentInput = uiState.tag === 'input' ? uiState.text : uiState.query
                if (currentInput) {
                    setInput(currentInput.slice(0, -1))
                } else {
                    back()
                }
                return
            }

            // Ctrl+Right Arrow = actionMenu
            default:
                if (e.key === 'ArrowRight' && e.ctrlKey) {
                    e.preventDefault()
                    if (selectedItem && selectedItem.triggers.includes('actionMenu')) {
                        sendTrigger(selectedItem, { type: 'actionMenu' })
                    }
                    return
                }
        }

        // Typing (single char, no ctrl/meta)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            const currentInput = uiState.tag === 'input' ? uiState.text : uiState.query
            const now = Date.now()
            const shouldReset = uiState.tag === 'list' && now - lastKeyTime.current > config.queryTimeoutMs
            const newValue = shouldReset ? e.key : currentInput + e.key
            setInput(newValue)
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

    // Header text
    const headerText = (() => {
        if (loading) return 'Aero Launcher'
        if (uiState.tag === 'input') return uiState.parent.name
        if (uiState.parent) return uiState.parent.name
        return selectedItem?.name ?? 'Aero Launcher'
    })()

    // Header icon
    const headerIcon = (() => {
        if (loading) return AERO_ICON
        if (uiState.tag === 'input') return uiState.parent.icon
        if (uiState.parent) return uiState.parent.icon
        return selectedItem?.icon ?? AERO_ICON
    })()

    // Query/text display
    const queryText = (() => {
        if (loading) return ''
        return uiState.tag === 'input' ? uiState.text : uiState.query
    })()

    // Placeholder for input mode
    const placeholder = uiState?.tag === 'input' ? uiState.placeholder : ''

    return (
        <div className="launcher select-none">
            {dialogItem && <ItemDialog item={dialogItem} onClose={closeDialog} />}

            <header className={`launcher-header drag-region ${loading ? 'loading' : ''}`}>
                <img className="header-icon" src={headerIcon} alt="" />
                <span className="header-title">
                    {headerText}
                    {loading && <LoadingBars />}
                </span>
                {!loading && (queryText || placeholder) && (
                    <span className="header-query">{queryText || placeholder}</span>
                )}
            </header>

            {!loading && items.length > 0 && (
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
                            onMouseEnter={() => setSelected(index)}
                            onClick={e => {
                                if (e.shiftKey) {
                                    setDialogItem(item)
                                } else {
                                    sendTrigger(item, { type: 'execute' })
                                }
                            }}
                        >
                            <img className="item-icon" src={item.icon} alt="" />
                            <span className="item-name">{item.name}</span>
                            {item.triggers.includes('browse') && (
                                <img className="item-chevron" src={Icons.chevron} alt="" />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!loading && items.length === 0 && (
                <div className="empty">
                    {uiState.tag === 'input' ? placeholder : 'No results'}
                </div>
            )}
        </div>
    )
}
