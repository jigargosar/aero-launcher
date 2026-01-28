import { contextBridge, ipcRenderer } from 'electron'
import { channels, ElectronAPI, UIState, UIEvent } from '@shared/types'

const api: ElectronAPI = {
    onState: (callback: (state: UIState) => void) => {
        ipcRenderer.on(channels.state, (_, state) => callback(state))
    },
    sendEvent: (event: UIEvent) => {
        ipcRenderer.send(channels.event, event)
    },
    requestState: () => {
        ipcRenderer.send(channels.requestState)
    },
}

contextBridge.exposeInMainWorld('electron', api)
