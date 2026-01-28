import {contextBridge, ipcRenderer} from 'electron'
import {channels, ElectronAPI, UIState, ListItem} from '@shared/types'

const api: ElectronAPI = {
    onState: (callback: (state: UIState) => void) => {
        ipcRenderer.on(channels.state, (_, state) => callback(state))
    },
    requestState: () => {
        ipcRenderer.send(channels.requestState)
    },
    setQuery: (query: string) => {
        ipcRenderer.send(channels.setQuery, query)
    },
    execute: (item: ListItem) => {
        ipcRenderer.send(channels.execute, item)
    },
    navigate: (item: ListItem) => {
        ipcRenderer.send(channels.navigate, item)
    },
    setInputText: (text: string) => {
        ipcRenderer.send(channels.setInputText, text)
    },
    back: () => {
        ipcRenderer.send(channels.back)
    },
    hideWindow: () => {
        ipcRenderer.send(channels.hideWindow)
    },
}

contextBridge.exposeInMainWorld('electron', api)
