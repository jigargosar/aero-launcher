import {contextBridge, ipcRenderer} from 'electron'
import {channels, ElectronAPI} from '@shared/types'

const api: ElectronAPI = {
    onListState: (callback) => {
        ipcRenderer.on(channels.listState, (_, state) => callback(state))
    },
    requestListState: () => {
        ipcRenderer.send(channels.requestListState)
    },
    hideWindow: () => {
        ipcRenderer.send(channels.hideWindow)
    },
    setQuery: (query) => {
        ipcRenderer.send(channels.setQuery, query)
    },
    setSelectedIndex: (index) => {
        ipcRenderer.send(channels.setSelectedIndex, index)
    },
    performPrimaryAction: (item) => {
        ipcRenderer.send(channels.performPrimaryAction, item)
    },
}

contextBridge.exposeInMainWorld('electron', api)
