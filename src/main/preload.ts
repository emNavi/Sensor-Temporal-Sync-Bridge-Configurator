import {contextBridge, ipcRenderer} from 'electron';
import { on } from 'events';
import { onUpdated } from 'vue';

contextBridge.exposeInMainWorld('electronAPI', {
    // nodejs 向 renderer 发送消息

  heartBeatStatusMessage: (callback) => ipcRenderer.on('heartbeat-status', (_event, value) => callback(value)),
  onLog: (callback: (msg: string) => void) => ipcRenderer.on('status-text', (_, msg) => callback(msg)),
  onTimeUpdate: (callback: (msg) => void) => ipcRenderer.on('time-update', (_, msg) => callback(msg)),

  openNewWindowWithOptions: (url: string, options: any) => ipcRenderer.send('open-new-window-with-options', url, options),
  sendMessage: (message: string) => ipcRenderer.send('message', message),

  triggerCalib: (message: JSON) => ipcRenderer.send('trigger-calib', message),

})
