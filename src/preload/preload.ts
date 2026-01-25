import {contextBridge, ipcRenderer} from 'electron'
import {channels, ElectronAPI} from '@shared/types'

const api: ElectronAPI = {
    onListItemsReceived: (callback) => {
        ipcRenderer.on(channels.listItems, (_, items) => callback(items))
    },
    requestListItems: () => {
        ipcRenderer.send(channels.requestListItems)
    },
    hideWindow: () => {
        ipcRenderer.send(channels.hideWindow)
    },
}

contextBridge.exposeInMainWorld('electron', api)
