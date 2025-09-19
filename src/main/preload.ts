import {contextBridge, ipcRenderer} from 'electron';
import { on } from 'events';
import { onUpdated } from 'vue';

contextBridge.exposeInMainWorld('electronAPI', {
    // nodejs 向 renderer 发送消息

  heartBeatStatusMessage: (callback) => ipcRenderer.on('heartbeat-status', (_event, value) => callback(value)),
  onLog: (callback: (msg: string) => void) => ipcRenderer.on('status-log', (_, msg) => callback(msg)),
  onTimeUpdate: (callback: (msg) => void) => ipcRenderer.on('time-update', (_, msg) => callback(msg)),
  onHighresImu: (callback: (msg) => void) => ipcRenderer.on('sensor-data', (_, msg) => callback(msg)),
  
  openNewWindowWithOptions: (url: string, options: any) => ipcRenderer.send('open-new-window-with-options', url, options),
  sendMessage: (message: string) => ipcRenderer.send('message', message),

  // calibration
  triggerCalib: (message: JSON) => ipcRenderer.send('trigger-calib', message),
  cancelCalib: () => ipcRenderer.send('cancel-calib'),
  onGyroCalibUpdate: (callback: (msg: string) => void) => ipcRenderer.on('gyro-calibration-status', (_, msg) => callback(msg)),
  onAccelCalibUpdate: (callback: (msg: string) => void) => ipcRenderer.on('accel-calibration-status', (_, msg) => callback(msg)),
  onMagCalibUpdate: (callback: (msg: string) => void) => ipcRenderer.on('mag-calibration-status', (_, msg) => callback(msg)),

  removeGyroCalibUpdateListener: () => ipcRenderer.removeAllListeners("gyro-calibration-status"),
  removeAccelCalibUpdateListener: () => ipcRenderer.removeAllListeners("accel-calibration-status"),
  removeMagCalibUpdateListener: () => ipcRenderer.removeAllListeners("mag-calibration-status"),
  // flash firmware
  enterDfuMode: () => ipcRenderer.send('enter-dfu'),
  selectFirmware: () => ipcRenderer.invoke("select-firmware"),
  flashFirmware: (path: string) => ipcRenderer.send('flash-firmware', path),
  onFlashStatus: (callback: (msg: string, type: string) => void) => {
    ipcRenderer.on("flash-status", (_, msg, type) => callback(msg, type));
  },

  // removeCalibrationAckListener: () => ipcRenderer.removeAllListeners("calibration:ack")
})
