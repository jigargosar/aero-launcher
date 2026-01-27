import {contextBridge, ipcRenderer} from 'electron'
import {channels, ElectronAPI} from '@shared/types'

const api: ElectronAPI = {
    onListMode: (callback) => {
        ipcRenderer.on(channels.listMode, (_, mode) => callback(mode))
    },
    requestListMode: () => {
        ipcRenderer.send(channels.requestListMode)
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
    executeItem: (item) => {
        ipcRenderer.send(channels.executeItem, item)
    },
    enterInputMode: (item) => {
        ipcRenderer.send(channels.enterInputMode, item)
    },
    setInputText: (text) => {
        ipcRenderer.send(channels.setInputText, text)
    },
    submitInput: () => {
        ipcRenderer.send(channels.submitInput)
    },
    exitInputMode: () => {
        ipcRenderer.send(channels.exitInputMode)
    },
}

contextBridge.exposeInMainWorld('electron', api)
