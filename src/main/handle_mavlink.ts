
const { MavLinkPacketRegistry,MavLinkPacketSplitter, MavLinkPacketParser,MavLinkPacket } = require('node-mavlink');
import { minimal, common, ardupilotmega, uavionix, icarous, MavLinkProtocol } from 'node-mavlink'
import { MavLinkProtocolV2, send } from 'node-mavlink'

printHello()
const REGISTRY = {
  ...minimal.REGISTRY,
  ...common.REGISTRY,
  ...ardupilotmega.REGISTRY,
  ...uavionix.REGISTRY,
  ...icarous.REGISTRY,
}

let device_online = false;
let last_heartbeat_time = 0;
let current_device_id: number | null = null; // 当前连接的设备ID

let baseUtcUs = BigInt(Date.now()) * 1000n;
const baseHrTime = process.hrtime(); // 秒 + 纳秒

function getUtcTimeUs(): bigint {
  const [sec, nano] = process.hrtime(baseHrTime);
  const deltaUs = BigInt(sec) * 1_000_000n + BigInt(nano) / 1000n;
  return baseUtcUs + deltaUs;
}

export function printHello() {
    console.log("helLo");
}
export function is_device_online() {
    // 判定标准是 心跳包
    const currentTime = Date.now();
    const timeDiff = currentTime - last_heartbeat_time;
    if (timeDiff > 2000) { 
      device_online = false;
      current_device_id = null; // 设备掉线，重置设备ID
      console.log(`Time since last HEARTBEAT: ${timeDiff} ms`);
    }
    else{
      device_online = true;
    }
    return device_online;
}
let lastAttitudeTime: number | null = null;
export function handle_mavlink_msg(packet,mainWindow,port){
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn('[electron] mainWindow 不存在或已销毁，丢弃消息');
      return;
    }
    const clazz = REGISTRY[packet.header.msgid]
    if (clazz) {
      const data = packet.protocol.data(packet.payload, clazz)
      if(clazz.MSG_NAME === "HEARTBEAT"){
        // const timestamp = new Date().toISOString();
        last_heartbeat_time = Date.now();
        device_online = true;
        current_device_id = packet.header.sysid; // 更新当前设备ID

        // 通知前端有心跳 + ID
        mainWindow.webContents.send('heartbeat', {
          id: current_device_id,
          timestamp: new Date().toISOString(),
        });
        // console.log(`HEARTBEAT received at ${timestamp}`);
      }
      else if (clazz.MSG_NAME === "STATUSTEXT") {
        const timestamp = new Date().toISOString();
        const statusText = data.text;
        const severity = data.severity;
        console.log(`STATUSTEXT received at ${timestamp}: ${statusText}`);
        //先用\n分割
        console.log(`STATUSTEXT received at ${timestamp}: ${statusText.split('\n')[0]}`);
        // 发送
        // ==== 分类处理 ====
        if (statusText.startsWith("ACC_CAL:")) {
          // 加速度计校准相关
          console.log("加速度计校准状态:", statusText);
          mainWindow.webContents.send("accel-calibration-status", statusText);
        }
        else if (statusText.startsWith("MAG_CAL:")) {
          // 磁力计校准相关
          console.log("磁力计校准状态:", statusText);
          mainWindow.webContents.send("mag-calibration-status", statusText);
        } 
        else if (statusText.startsWith("GYRO_CAL:")) {
          // 陀螺仪校准相关
          console.log("陀螺仪校准状态:", statusText);
          mainWindow.webContents.send("gyro-calibration-status", statusText);
        }
        else if( statusText.startsWith("Jump to bootloader")) {
          // 进入DFU模式
          console.log("Sending firmware:dfu:", statusText);
          // const dfu = exec(`dfu-util -a 0 -s 0x08000000:leave -D ${firmwarePath}`);
        }
        else {
          // 普通日志输出
          mainWindow.webContents.send("status-log", statusText, severity);
        }
      }
      else if (clazz.MSG_NAME === "TIMESYNC") {
        // console.log(`TIMESYNC received: ${data.tc1} ${data.ts1}`);
        // console.log(packet.debug())
        const utcTimeUs = getUtcTimeUs();
        send_timesync_msg(port, utcTimeUs, data.ts1);
        // console.log(`UTC time in microseconds: ${utcTimeUs}`);
      }
      else if (clazz.MSG_NAME === "SYSTEM_TIME") {
        // console.log(data)
        // console.log(`SYSTEM_TIME received: ${data.timeUnixUsec} ${data.timeBootMs}`);
        mainWindow.webContents.send('time-update', {
          timeUnixUsec: data.timeUnixUsec,
          timeBootMs: data.timeBootMs
        });

      }
      else if(clazz.MSG_NAME === "CAMERA_TRIGGER"){
        // console.log(`CAMERA_TRIGGER received: ${data.seq} ${data.timeUsec}`);
        mainWindow.webContents.send('camera-trigger', {
          seq: data.seq,
          timeUsec: data.timeUsec
        });
      }
      else if(clazz.MSG_NAME === "HIGHRES_IMU"){
        
        const sensor_data = {
          timeUsec: data.timeUsec,
          acc : {x: data.xacc, y: data.yacc, z: data.zacc },
          gyro: {x: data.xgyro, y: data.ygyro,  z: data.zgyro },
          mag : {x: data.xmag, y: data.ymag, z: data.zmag },
          baro: {abs_pressure: data.absPressure, pressure_alti: data.pressureAlt}
        };
        // console.log("✅ HIGHRES_IMU received:", data);
        mainWindow.webContents.send('sensor-data', sensor_data);
      }
      else if(clazz.MSG_NAME === "ATTITUDE"){
        const attitude_data = {
          timeUsec: data.timeUsec,
          roll: data.roll,
          pitch: data.pitch,
          yaw: data.yaw,
        };
        // console.log("✅ ATTITUDE received:", data);
        mainWindow.webContents.send('attitude-data', attitude_data);
      }
      else if(clazz.MSG_NAME === "COMMAND_ACK"){       // 处理命令确认
        console.log(`COMMAND_ACK received: ${data.command} ${data.result}`);
        if(data.command === 241){ // MAV_CMD_PREFLIGHT_CALIBRATION
          let resultText = "";
          switch(data.result) {
            case 0:
              mainWindow.webContents.send("calibration:ack", { stage: "start" });
              break;
            case 4:
              mainWindow.webContents.send("calibration:ack", { stage: "failed" });
              break;
            case 10:
              mainWindow.webContents.send("calibration:ack", { stage: "done" });
              break;
            default:
              resultText = "Unknown Result";  
          }
          mainWindow.webContents.send('calibration-result', {
            sucess: data.result === 0,
            message: resultText
          });
        }
      }
      else{
        console.log(`Received message: ${clazz.MSG_NAME}`);
        console.log(packet)
      }

    } else {
      console.log(packet)
      console.log(packet.debug())
      console.log('!', packet.debug())
    }

}

export function send_timesync_msg(port,tc1, ts1) {
    const msg = new common.TimeSync()
    msg.tc1 = tc1;
    msg.ts1 = ts1;
    msg.targetComponent = 1;
    msg.targetSystem = 1;
    send(port, msg,new MavLinkProtocolV2());
}

export function send_cam_trigger_interval(port, messageId, intervalUs) {
  const msg = new common.MessageInterval();
  msg.messageId = messageId;
  msg.intervalUs = intervalUs;
  send(port, msg, new MavLinkProtocolV2());
  console.log(`Sent MESSAGE_INTERVAL for message ID ${messageId} with interval ${intervalUs} us`);
  console.log(msg);
}

export function send_cam_trigger_mode(port, continuously, frame_duration_ms, trigger_mode) {
  const msg = new common.CommandInt();
  msg.targetSystem = 1;
  msg.targetComponent = 1;
  msg.command = 206; 
  msg._param1 = continuously;  // 0: disable, 1: trigger continuously
  msg._param2 = frame_duration_ms;  
  msg._param3 = trigger_mode;  // 0: disable, 1: trigger once
  msg._param4 = 0;
  if(port){
    console.log("Sending camera trigger mode...");
    send(port, msg, new MavLinkProtocolV2());
  }
}

export function send_time_sync_mode(port, mode) {
  const msg = new common.CommandInt();
  msg.targetSystem = 1;
  msg.targetComponent = 1;
  msg.command = 183; 
  msg._param1 = mode;  // 0: internal, 1: external, 2: GPS
  msg._param2 = 0;  
  msg._param3 = 0;
  msg._param4 = 0;
  if(port){
    console.log("Sending time sync mode...");
    send(port, msg, new MavLinkProtocolV2());
  }
}

export function send_upgrade_request(port) {
  const msg = new common.CommandInt();
  msg.targetSystem = 1;
  msg.targetComponent = 1;
  msg.command = 180;
  msg._param1 = 1;  
  msg._param2 = 1;  
  msg._param3 = 0;
  msg._param4 = 0;
  if(port){
    console.log("Sending upgrade request...");
    send(port, msg, new MavLinkProtocolV2());
  }
}

/// 校准触发
export function send_sensor_calib(port, acc=false,gyro=false,mag=false,baro=false)
{
  const send_message = new common.PreflightCalibrationCommand();
  // send_message.target_system = 1;\
  send_message.targetSystem = 1   // target_system
  send_message.targetComponent = 1;    // target_component
  // MAV_CMD_PREFLIGHT_CALIBRATION （241）
  send_message.gyroTemperature = 0;    // param1
  send_message.magnetometer=0;        // param2
  send_message.groundPressure=0;      // param3
  send_message.remoteControl=0;      // param4
  send_message.accelerometer=0;     // param5
  send_message.compmotOrAirspeed=0;     // param6
  send_message.escOrBaro=0;     // param7

  if(acc){
    send_message.accelerometer = 1;
  }
  else if(gyro){
    send_message.gyroTemperature = 1;
  }
  else if(mag){
    send_message.magnetometer = 1;
  }
  else if(baro){
    send_message.groundPressure = 1;
  }

  if(port){
    send(port,send_message,new MavLinkProtocolV2())
  }
}

export function sendMavlinkDebugOn(port) {
  const msg = new common.LoggingStartCommand();
  msg.targetSystem = 1;
  msg.targetComponent = 1;
  msg.format = 0;
  if(port){
    send(port, msg, new MavLinkProtocolV2());
  }
  console.log("Sent DEBUG ON command");
}

export function sendMavlinkDebugOff(port) {
  const msg = new common.LoggingStopCommand();
  msg.targetSystem = 1;
  msg.targetComponent = 1;
  if(port){
    send(port, msg, new MavLinkProtocolV2());
  }
  console.log("Sent DEBUG OFF command");
}