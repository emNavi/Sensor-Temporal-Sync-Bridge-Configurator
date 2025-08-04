
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
      console.log(`Time since last HEARTBEAT: ${timeDiff} ms`);
    }
    else{
      device_online = true;
    }
    return device_online;
}
export function handle_mavlink_msg(packet,mainWindow,port){
    const clazz = REGISTRY[packet.header.msgid]
    if (clazz) {
      const data = packet.protocol.data(packet.payload, clazz)
      // console.log('>', data)
      // console.log("clazz", clazz)
      if(clazz.MSG_NAME === "HEARTBEAT"){
        const timestamp = new Date().toISOString();
        last_heartbeat_time = Date.now();
        device_online = true;
        
        // console.log(`HEARTBEAT received at ${timestamp}`);
      }
      else if (clazz.MSG_NAME === "STATUSTEXT") {
        const timestamp = new Date().toISOString();
        const statusText = data.text;
        // console.log(`STATUSTEXT received at ${timestamp}: ${statusText}`);
        //先用\n分割
        console.log(`STATUSTEXT received at ${timestamp}: ${statusText.split('\n')[0]}`);
        // 发送
        mainWindow.webContents.send('status-text', statusText.split('\n')[0]);
      }
      else if (clazz.MSG_NAME === "TIMESYNC") {
        // console.log(`TIMESYNC received: ${data.tc1} ${data.ts1}`);
        // console.log(packet.debug())
        const utcTimeUs = getUtcTimeUs();
        send_timesync_msg(port, utcTimeUs, data.ts1);
        // console.log(`UTC time in microseconds: ${utcTimeUs}`);
      }
      else if (clazz.MSG_NAME === "SYSTEM_TIME") {
        console.log(data)

            console.log(`SYSTEM_TIME received: ${data.timeUnixUsec} ${data.timeBootMs}`);
            mainWindow.webContents.send('time-update', {
              timeUnixUsec: data.timeUnixUsec,
              timeBootMs: data.timeBootMs
            });

      }
      else if(clazz.MSG_NAME === "CAMERA_TRIGGER"){
        console.log(`CAMERA_TRIGGER received: ${data.seq} ${data.timeUsec}`);
        mainWindow.webContents.send('camera-trigger', {
          seq: data.seq,
          timeUsec: data.timeUsec
        });
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
}