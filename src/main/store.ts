import {ipcMain, WebContents} from 'electron'
import {channels, ListItem} from '@shared/types'

export const Store = {
    init(webContents: WebContents): void {
        const items: ListItem[] = [
            {id: '1', name: 'Google Search'},
            {id: '2', name: 'Calculator'},
            {id: '3', name: 'Calendar'},
            {id: '4', name: 'Notes'},
            {id: '5', name: 'Settings'},
            {id: '6', name: 'Terminal'},
            {id: '7', name: 'Files'},
            {id: '8', name: 'Music'},
        ]

        ipcMain.on(channels.requestListItems, () => {
            webContents.send(channels.listItems, items)
        })
    }
}
