import {ipcMain, WebContents} from 'electron'
import {channels, ListItem} from '@shared/types'

export const Store = {
    init(webContents: WebContents): void {
        const items: ListItem[] = [
            {id: '1', name: 'Item 1'},
            {id: '2', name: 'Item 2'},
        ]

        ipcMain.on(channels.requestListItems, () => {
            webContents.send(channels.listItems, items)
        })
    }
}
