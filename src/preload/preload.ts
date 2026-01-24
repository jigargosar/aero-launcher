import { contextBridge, ipcRenderer } from 'electron'
import { channels, ListItem, ElectronAPI } from '@shared/types'

const api: ElectronAPI = {
  onListState: (callback: (items: ListItem[]) => void) => {
    ipcRenderer.on(channels.listState, (_, items) => callback(items))
  },
  requestListState: () => {
    ipcRenderer.send(channels.requestListState)
  }
}

contextBridge.exposeInMainWorld('electron', api)
