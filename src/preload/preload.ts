import {contextBridge, ipcRenderer} from 'electron'
import {channels, ElectronAPI} from '@shared/types'

const api: ElectronAPI = {
    onState: (callback) => {
        ipcRenderer.on(channels.state, (_, state) => callback(state))
    },
    requestState: () => {
        ipcRenderer.send(channels.requestState)
    },
    navigate: (type, item) => {
        ipcRenderer.send(channels.navigate, type, item)
    },
    back: () => {
        ipcRenderer.send(channels.back)
    },
    execute: (item) => {
        ipcRenderer.send(channels.execute, item)
    },
    setFilterQuery: (query) => {
        ipcRenderer.send(channels.setFilterQuery, query)
    },
    setInputText: (text) => {
        ipcRenderer.send(channels.setInputText, text)
    },
    setSelectedIndex: (index) => {
        ipcRenderer.send(channels.setSelectedIndex, index)
    },
    hideWindow: () => {
        ipcRenderer.send(channels.hideWindow)
    },
}

contextBridge.exposeInMainWorld('electron', api)
