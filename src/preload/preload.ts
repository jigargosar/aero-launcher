import {contextBridge, ipcRenderer} from 'electron'
import {channels, ElectronAPI} from '@shared/types'

const api: ElectronAPI = {
    onListItemsReceived: (callback) => {
        ipcRenderer.on(channels.listItems, (_, items) => callback(items))
    },
    requestListItems: () => {
        ipcRenderer.send(channels.requestListItems)
    },
}

contextBridge.exposeInMainWorld('electron', api)
