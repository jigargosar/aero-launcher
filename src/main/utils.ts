import {dialog} from 'electron'
import {ListItem} from '@shared/types'

export function showItemDialog(item: ListItem): void {
    dialog.showMessageBox({
        type: 'info',
        title: item.name,
        message: `Name: ${item.name}\nID: ${item.id}\nSource: ${item.sourceId}`,
    })
}
