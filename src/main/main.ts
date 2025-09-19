import {app, BrowserWindow, ipcMain, session, dialog} from 'electron';
import {join} from 'path';
import { networkInterfaces } from 'os';

const dgram = require('dgram');
const { Mutex } = require('async-mutex');
const path = require('path');
import os from 'os';
import { promisify } from 'util';
import { el, fa, th, tr } from 'element-plus/es/locale';
import { ElMessageBox } from 'element-plus';
import { exec, spawn } from 'child_process';

import { SerialPort } from 'serialport';

import { printHello,handle_mavlink_msg,is_device_online,send_sensor_calib, send_upgrade_request } from './handle_mavlink';
// https://www.npmjs.com/package/node-mavlink/v/1.0.0-rc.1

const { MavLinkPacketRegistry,MavLinkPacketSplitter, MavLinkPacketParser,MavLinkPacket } = require('node-mavlink');
import { minimal, common, ardupilotmega, uavionix, icarous, MavLinkProtocol } from 'node-mavlink'

printHello()
const REGISTRY = {
  ...minimal.REGISTRY,
  ...common.REGISTRY,
  ...ardupilotmega.REGISTRY,
  ...uavionix.REGISTRY,
  ...icarous.REGISTRY,
}

function createWindow () {
    const mainWindow = new BrowserWindow({
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
      console.log("dev mode");
      mainWindow.webContents.openDevTools();

      const rendererPort = process.argv[2];
      mainWindow.loadURL(`http://localhost:${rendererPort}`);
    }
    else {
      mainWindow.loadFile(join(app.getAppPath(), 'renderer', 'index.html'));
    }

  let port: SerialPort | null = null;

  // TODO：重启后没有删除之前的

  function findAndOpenEmNaviDevice() {
    const command = "ls /dev/ttyACM*";
    const checkForDevice = () => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${error.message}`);
          setTimeout(checkForDevice, 1000); // Retry after 1 second
          return;
        }
        if (stderr) {
          console.error(`Error: ${stderr}`);
          setTimeout(checkForDevice, 1000); // Retry after 1 second
          return;
        }

        const devices = stdout.split('\n').filter((device) => device.trim() !== '');
        const emNaviDevice = devices.find((device) => device.includes('ttyACM'));

        if (emNaviDevice) {
          console.log(`Found emNavi device: ${emNaviDevice}`);
          // Open the device or perform further actions
          port = new SerialPort({
            path: emNaviDevice,
            baudRate: 1000000,
          })
          const reader =   port.pipe(new MavLinkPacketSplitter()).pipe(new MavLinkPacketParser());
          if (port) {
            reader.on('open', () => {
              console.log(`Serial port ${emNaviDevice} opened successfully.`);
            });
            reader.on('error', (err: Error) => {
              console.error(`Error opening serial port: ${err.message}`);
              console.log('Retrying connection...');
            });
            reader.on('data', (packet) => {

              handle_mavlink_msg(packet,mainWindow,port)
              // Process the received message here
            });
            reader.on('close', () => {
              console.log(`Serial port ${emNaviDevice} closed. Retrying connection...`);
            });
          }
        } else {
          console.log('No emNavi device found. Retrying...');
        }
      });
    };

    checkForDevice();
    setInterval(() => {
      if (is_device_online()){
        mainWindow.webContents.send('heartbeat-status', true);
      }
      else {
        mainWindow.webContents.send('heartbeat-status', false);
        if (port) {
          console.log('Port is open, closing...');
          port.close((err) => {
            if (err) {
              console.error(`Error closing port: ${err.message}`);
              checkForDevice(); // 这个位置很重要
            } else {
              console.log('Port closed successfully.');
              checkForDevice(); // 这个位置很重要
            }
          });
          port = null;
        }
      }
    }, 2000); 
  }
  findAndOpenEmNaviDevice();

  ipcMain.on('enter-dfu', () => {
    if (port) {
      send_upgrade_request(port);
    } else {
      console.error('Serial port not open. Cannot enter DFU mode.');
    }
  });
  ipcMain.handle("select-firmware", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Firmware", extensions: ["bin", "hex"] }],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.on("flash-firmware", (event, firmwarePath: string) => {
    if (!firmwarePath) {
      mainWindow?.webContents.send("flash-status", "未选择固件文件", "error");
      return;
    }

    const args = ["-a", "0", "-s", "0x08000000:leave", "-D", firmwarePath];
    console.log("⚡ Executing: dfu-util " + args.join(" "));

    mainWindow?.webContents.send("flash-status", "正在烧录固件...", "info");

    const dfu = spawn("dfu-util", args);

    dfu.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log("[DFU-OUT]", msg);
      mainWindow?.webContents.send("flash-status", msg, "info");
    });

    dfu.stderr.on("data", (data) => {
      const msg = data.toString();
      console.error("[DFU-ERR]", msg);
      mainWindow?.webContents.send("flash-status", msg, "error");
    });

    dfu.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Flash success");
        mainWindow?.webContents.send("flash-status", "烧录完成 ✅", "success");
      } else {
        console.error("❌ Flash failed, exit code", code);
        mainWindow?.webContents.send("flash-status", `烧录失败 (code=${code})`, "error");
      }
    });
  });

  ipcMain.on('trigger-calib', (event, message) => {
    console.log("Received calibration request:", message);
    send_sensor_calib(port, message.params.acc,message.params.gyro,message.params.mag,message.params.baro);
  })
  ipcMain.on('cancel-calib', () => {
    if (port) {
      // 发送 MAVLink 取消消息给 STM32
      console.log('❌ 取消校准');
      send_sensor_calib(port, false, false, false, false); 
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['script-src \'self\'']
      }
    })
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  
});



app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

// ipcMain.on('message', (event, message) => {
//   console.log(message);
// })

// let openwindowList: string[] = [];
// // 监听渲染进程的请求
// ipcMain.on('open-new-window-with-options', (event, options) => {
//   console.log("open-new-window-with-options");
//   console.log(options);
//   console.log(openwindowList);
//   if (!openwindowList.includes(options.window_id)) {
//     openwindowList.push(options.window_id);
//     const newWindow = new BrowserWindow(options);
//     if (options.loadFile) {
//       newWindow.loadFile(options.loadFile).then(() => {
//         newWindow.setTitle('My Electron App'); // 在网页加载完成后设置标题
//     });
//     } else if (options.loadURL) {
//         newWindow.loadURL(options.loadURL).then(() => {
//           if (options.title)
//             {
//                   newWindow.setTitle(options.title); // 在网页加载完成后设置标题
                  
//             }
//       });
//     }
//     newWindow.on('closed', () => {
//       console.log('New window closed');
//       // 通过IPC通知渲染进程窗口关闭
//       // newWindow.webContents.send('window-closed'); // 向渲染进程发送窗口关闭的事件
//       openwindowList = openwindowList.filter((value) => value !== options.window_id);
//   });
//   }
//   else {
//     console.log("window already opened");
//   }

  

// });