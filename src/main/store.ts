import {ipcMain, WebContents} from 'electron'
import {channels, ListItem} from '@shared/types'
import {icons} from '../shared/icons'

export const Store = {
    init(webContents: WebContents): void {
        const items: ListItem[] = [
            {id: '1', name: 'Google Search', icon: icons.search},
            {id: '2', name: 'Calculator', icon: icons.calculator},
            {id: '3', name: 'Calendar', icon: icons.calendar},
            {id: '4', name: 'Notes', icon: icons.notes},
            {id: '5', name: 'Settings', icon: icons.settings},
            {id: '6', name: 'Terminal', icon: icons.terminal},
            {id: '7', name: 'Files', icon: icons.folder},
            {id: '8', name: 'Music', icon: icons.music},
        ]

        ipcMain.on(channels.requestListItems, () => {
            webContents.send(channels.listItems, items)
        })
    }
}
