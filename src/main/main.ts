import {app, BrowserWindow, ipcMain, session, dialog} from 'electron';
import {join} from 'path';
import os from 'os';
import { exec, spawn } from 'child_process';
import { SerialPort } from 'serialport';
import { printHello, handle_mavlink_msg, is_device_online, send_sensor_calib, send_upgrade_request, send_cam_trigger_interval,send_cam_trigger_mode } from './handle_mavlink';
const { MavLinkPacketSplitter, MavLinkPacketParser } = require('node-mavlink');

let mainWindow: BrowserWindow | null = null;
let port: SerialPort | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

async function listPorts(): Promise<{ path: string; friendlyName?: string }[]> {
  const platform = os.platform();
  console.log(`Listing ports on platform: ${platform}`);
  if (platform === 'win32') {
    const ports = await SerialPort.list();
    return ports.map(p => ({
      path: p.path,
      friendlyName: p.manufacturer || p.path   
    }));
  } else {
    // Linux: 只列出 /dev/ttyACM*
    return new Promise((resolve) => {
      exec('ls /dev/ttyACM* 2>/dev/null', (err, stdout) => {
        if (err) return resolve([]);
        const devices = stdout
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(path => ({ path }));
        resolve(devices);
      });
    });
  }
}

function connectDevice(path: string) {
  if (port) {
    port.close(() => {
      port = null;
      openPort(path);
    });
  } else {
    openPort(path);
  }
}

function openPort(path: string) {
  port = new SerialPort({ path, baudRate: 1000000 });
  const reader = port.pipe(new MavLinkPacketSplitter()).pipe(new MavLinkPacketParser());

  reader.on('data', (packet) => {
    handle_mavlink_msg(packet, mainWindow, port);
  });

  // 串口异常或关闭
  const handleDisconnect = () => {
    console.log('串口关闭/错误');
    mainWindow?.webContents.send('device-disconnected', path);
    port = null;

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  reader.on('error', handleDisconnect);
  reader.on('close', handleDisconnect);

  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      if (mainWindow) {
        mainWindow.webContents.send('heartbeat-status', is_device_online());
      }
    }, 2000);
  }
}

function disconnectDevice() {
  if (port) {
    const path = port.path;
    mainWindow?.webContents.send('device-disconnected', path);

    port.close(() => {
      console.log('串口断开');
      port = null;
    });
  }
  // 清理心跳检测
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 780,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  } else {
    mainWindow.loadFile(join(app.getAppPath(), 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('list-ports', listPorts);
  ipcMain.on('connect-port', (_event, path: string) => connectDevice(path));
  ipcMain.on('disconnect-port', () => disconnectDevice());

  ipcMain.on('enter-dfu', () => {
    if (port) {
      send_upgrade_request(port);
    } else {
      console.error('Serial port not open. Cannot enter DFU mode.');
    }
  });

  ipcMain.handle("select-firmware", async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Firmware", extensions: ["bin", "hex"] }],
    });
    return (!result.canceled && result.filePaths.length > 0) ? result.filePaths[0] : null;
  });

  ipcMain.on("flash-firmware", (_event, firmwarePath: string) => {
    if (!firmwarePath) {
      mainWindow?.webContents.send("flash-status", "未选择固件文件", "error");
      return;
    }
    const args = ["-a", "0", "-s", "0x08000000:leave", "-D", firmwarePath];
    const dfu = spawn("dfu-util", args);
    dfu.stdout.on("data", (data) => {
      mainWindow?.webContents.send("flash-status", data.toString(), "info");
    });
    dfu.stderr.on("data", (data) => {
      mainWindow?.webContents.send("flash-status", data.toString(), "error");
    });
    dfu.on("close", (code) => {
      if (code === 0) mainWindow?.webContents.send("flash-status", "烧录完成 ✅", "success");
      else mainWindow?.webContents.send("flash-status", `烧录失败 (code=${code})`, "error");
    });
  });

  ipcMain.on('trigger-calib', (_event, message) => {
    send_sensor_calib(port, message.params.acc,message.params.gyro,message.params.mag,message.params.baro);
  });
  ipcMain.on('cancel-calib', () => {
    if (port) send_sensor_calib(port, false, false, false, false);
  });

  ipcMain.on('send-camera-command', (_event, message) => {
    if (!port) return;

    switch (message.cmd) {
      case 'trigger':
        send_cam_trigger_mode(port, 0, 1000, 1); // 单次触发模式
        console.log('Sending trigger command');
        break;
      case 'pause':
        send_cam_trigger_mode(port, 0, 1000, 0);
        console.log('Sending pause command');
        break;
      case 'set-fps':
        const frame_duration_ms = 1000.0 / message.fps;
        send_cam_trigger_mode(port, 1, frame_duration_ms, 0);
        console.log(`Setting camera FPS to ${message.fps}, frame_duration_ms: ${frame_duration_ms}ms`);
        break;
    }
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['script-src \'self\'']
      }
    })
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
