import {app, BrowserWindow, ipcMain, session, dialog} from 'electron';
import {join} from 'path';
import os from 'os';
import { exec, spawn } from 'child_process';
import { SerialPort } from 'serialport';
import { printHello, handle_mavlink_msg, is_device_online, send_sensor_calib, send_upgrade_request, send_cam_trigger_interval,send_cam_trigger_mode, send_time_sync_mode } from './handle_mavlink';
import { send } from 'node-mavlink';
const { MavLinkPacketSplitter, MavLinkPacketParser } = require('node-mavlink');

let mainWindow: BrowserWindow | null = null;
let port: SerialPort | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

enum trigger_mode {
  CONTINUOUS = 0,
  SINGLE = 1,
  STOP = 2
}
async function listPorts(): Promise<{ path: string; friendlyName?: string }[]> {
  const platform = os.platform();
  console.log(`Listing ports on platform: ${platform}`);
  if (platform === 'win32') {
    const ports = await SerialPort.list();
    return ports.map(p => {
      let friendlyName = p.path; // 默认使用 COM 端口号
      
      // 如果有制造商信息，添加到名称中
      if (p.manufacturer) {
        friendlyName = `${p.path} - ${p.manufacturer}`;
      }
      
      return {
        path: p.path,
        friendlyName
      };
    });
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

function checkForDFUDevice(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === "linux") {
      // Linux 下通过 lsusb 判断
      exec("lsusb", (error, stdout) => {
        if (error) return resolve(false);
        resolve(stdout.includes("0483:df11"));
      });
    } else if (process.platform === "win32") {
      // Windows 下通过 wmic 检查 USB 设备
      exec(
        "wmic path Win32_PnPEntity get DeviceID,Name",
        { encoding: "utf8" },
        (error, stdout) => {
          if (error) return resolve(false);
          resolve(stdout.includes("VID_0483&PID_DF11"));
        }
      );
    } else {
      // 其他平台暂不支持
      resolve(false);
    }
  });
}

// 轮询检测 DFU 设备是否上线
async function waitForDFUDevice(mainWindow: BrowserWindow) {
  let found = false;
  for (let i = 0; i < 10; i++) { // 最多检测 10 次，每次间隔 500ms
    found = await checkForDFUDevice();
    if (found) {
      mainWindow.webContents.send("dfu-device-detected");
      console.log("DFU 设备已连接");
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!found) {
    mainWindow.webContents.send("dfu-device-not-found");
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

  // 烧录固件相关
  // 进入 DFU 模式
  ipcMain.on('enter-dfu', () => {
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (!mainWindow) return;
    
    if (port) {
      send_upgrade_request(port);
      waitForDFUDevice(mainWindow);
    } else {
      console.error('Serial port not open. Cannot enter DFU mode.');
    }
  });
  // 选择固件文件
  ipcMain.handle("select-firmware", async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Firmware", extensions: ["bin", "hex"] }],
    });
    return (!result.canceled && result.filePaths.length > 0) ? result.filePaths[0] : null;
  });
  // 烧录固件
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
      if (code === 0) mainWindow?.webContents.send("flash-status", "烧录完成", "success");
      else mainWindow?.webContents.send("flash-status", `烧录失败 (code=${code})`, "error");
    });
  });

  // 校准相关
  ipcMain.on('trigger-calib', (_event, message) => {
    send_sensor_calib(port, message.params.acc,message.params.gyro,message.params.mag,message.params.baro);
  });
  ipcMain.on('cancel-calib', () => {
    if (port) send_sensor_calib(port, false, false, false, false);
  });

  // 相机控制相关
  ipcMain.on('send-camera-command', (_event, message) => {
    if (!port) return;

    switch (message.cmd) {
      case 'trigger':
        send_cam_trigger_mode(port, trigger_mode.SINGLE, 1000, trigger_mode.SINGLE); // 单次触发模式
        console.log('Sending trigger command');
        break;
      case 'pause':
        send_cam_trigger_mode(port, trigger_mode.STOP, 1000, trigger_mode.STOP);
        console.log('Sending pause command');
        break;
      case 'set-fps':
        const frame_duration_ms = 1000.0 / message.fps;
        send_cam_trigger_mode(port, trigger_mode.CONTINUOUS, frame_duration_ms, trigger_mode.CONTINUOUS);
        console.log(`Setting camera FPS to ${message.fps}, frame_duration_ms: ${frame_duration_ms}ms`);
        break;
    }
  });

  ipcMain.on('set-time-sync-mode', (_event, mode: string) => {
    if (!port) return;

    switch (mode) {
      case 'internal':
        send_time_sync_mode(port, 0);
        console.log('Set time sync mode to internal');
        break;
      case 'external':
        send_time_sync_mode(port, 1);
        console.log('Set time sync mode to external');
        break;
      case 'gps':
        send_time_sync_mode(port, 2);
        console.log('Set time sync mode to GPS');
        break;
      default:
        console.error('Unknown time sync mode:', mode);
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
