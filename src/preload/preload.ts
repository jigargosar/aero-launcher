import {contextBridge, ipcRenderer} from 'electron'
import {channels, ElectronAPI} from '@shared/types'

const api: ElectronAPI = {
    onListState: (callback) => {
        ipcRenderer.on(channels.listState, (_, items) => callback(items))
    }
}

contextBridge.exposeInMainWorld('electron', api)
