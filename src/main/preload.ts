import {contextBridge, ipcRenderer} from 'electron';
import { char } from 'node-mavlink';

contextBridge.exposeInMainWorld('electronAPI', {
    // nodejs 向 renderer 发送消息

  // 端口连接
  listPorts: () => ipcRenderer.invoke('list-ports'),
  connectPort: (path: string) => ipcRenderer.send('connect-port', path),
  disconnectPort: () => ipcRenderer.send('disconnect-port'),
  onDeviceDisconnected: (callback: () => void) => ipcRenderer.on('device-disconnected', callback),
  onHeartbeat: (callback: (data: {id: number, timestamp: string}) => void) => ipcRenderer.on('heartbeat', (_event, data) => callback(data)),
  // 心跳状态
  heartBeatStatusMessage: (callback) => ipcRenderer.on('heartbeat-status', (_event, value) => callback(value)),
  // 同步状态
  onTimeSyncStatus: (callback: (data: {syncStatus: boolean}) => void) => ipcRenderer.on('sync-status', (_event, data) => callback(data)),
  // onLog: (callback: (msg: string) => void) => ipcRenderer.on('status-log', (_, msg) => callback(msg)),
  onLog: (callback: (msg: string, severity: char) => void) => ipcRenderer.on('status-log', (_, msg, severity) => callback(msg, severity)),
  enableDebugMode: (flag) => ipcRenderer.send("set-debug-mode", flag),

  onTimeUpdate: (callback: (msg) => void) => ipcRenderer.on('time-update', (_, msg) => callback(msg)),
  onHighresImu: (callback: (msg) => void) => ipcRenderer.on('sensor-data', (_, msg) => callback(msg)),
  onAttitude: (callback: (msg) => void) => ipcRenderer.on('attitude-data', (_, msg) => callback(msg)),
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
  onFlashStatus: (callback: (msg: string, type: string) => void) => ipcRenderer.on("flash-status", (_, msg, type) => callback(msg, type)) ,
  onDfuDetected: (callback) => ipcRenderer.on("dfu-device-detected", callback),
  onDfuNotFound: (callback) => ipcRenderer.on("dfu-device-not-found", callback),

  removeDfuDetectedListener: () => ipcRenderer.removeAllListeners("dfu-device-detected"),
  removeDfuNotFoundListener: () => ipcRenderer.removeAllListeners("dfu-device-not-found"),

  // camera
  sendCameraCommand: (message: JSON) => ipcRenderer.send('send-camera-command', message),
  onCameraTrigger: (callback: (msg) => void) => ipcRenderer.on('camera-trigger', (_, msg) => callback(msg)),

  // board settings
  setTimeSyncMode: (mode: string) => ipcRenderer.send('set-time-sync-mode', mode),
  // request param
  requestParam: (ComponentID: number) => ipcRenderer.send('request-param', ComponentID),
  onParamValue: (callback) => { const listener = (_event, msg) => callback(msg); ipcRenderer.on('param-value', listener); return () => { ipcRenderer.removeListener('param-value', listener); }; },
  // reboot device
  rebootDevice: () => ipcRenderer.send('reboot-device'),

})
