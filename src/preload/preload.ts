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
    setQuery: (query) => {
        ipcRenderer.send(channels.setQuery, query)
    },
    performPrimaryAction: (item) => {
        ipcRenderer.send(channels.performPrimaryAction, item)
    },
    // Launcher state from main
    onLauncherState: (callback) => {
        ipcRenderer.on(channels.launcherState, (_, state) => callback(state))
    },
}

contextBridge.exposeInMainWorld('electron', api)
