// @ts-nocheck

import {BrowserWindow, dialog} from 'electron'
import {ListItem} from '@shared/types'

export function showItemDialog(item: ListItem): void {
    const metadataLines = item.metadata
        ? Object.entries(item.metadata).map(([k, v]) => `${k}: ${v}`).join('\n')
        : ''

    const message = [
        `Name: ${item.name}`,
        `ID: ${item.id}`,
        `Source: ${item.sourceId}`,
        metadataLines,
    ].filter(Boolean).join('\n')

    dialog
        .showMessageBox({
            type: 'info',
            title: item.name,
            message,
        })
        .catch(reason => console.error(reason))
}