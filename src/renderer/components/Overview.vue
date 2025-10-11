<template>
    <div class="overview">
        <!-- <h1>系统总览</h1> -->
        <p class="page_title">系统状态</p>
        <el-divider/>

        <div class="sensor-list">
            <!-- 单独显示系统时间 -->
            <div v-if="systemTimeSensor" class="sensor-item">
                <h2>{{ systemTimeSensor.name }}</h2>
                <div v-if="Object.keys(systemTimeSensor.metadata).length">
                <p v-for="(value, key) in systemTimeSensor.metadata" :key="key">
                    <span style="display: inline-block; width: 100px; font-weight: bold;">
                    {{ systemTimeSensor.metadescribe[key] }}:
                    </span>
                    <span>{{ value }}</span>
                </p>
                </div>
            </div>
            </div>

            <div class="sensor-list">
            <!-- 其余传感器（IMU、气压计、磁力计、GPS） -->
            <div v-for="sensor in otherSensors" :key="sensor.id" class="sensor-item">
                <h2>{{ sensor.name }}</h2>
                <div v-if="Object.keys(sensor.metadata).length">
                <p v-for="(value, key) in sensor.metadata" :key="key">
                    <span style="display: inline-block; width: 100px; font-weight: bold;">
                    {{ sensor.metadescribe[key] }}:
                    </span>
                    <span>{{ value }}</span>
                </p>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';

const systemTimeSensor = computed(() => sensors.find(s => s.name === "系统时间"));
const otherSensors = computed(() => sensors.filter(s => s.name !== "系统时间"));

interface Sensor {
    id: number;
    name: string;
    metadata: Record<string, string>;
    metadescribe?: Record<string, string>;
    type?: string;
    status?: string;
    value?: string;
}

const sensors = reactive<Sensor[]>([
    { 
        id: 1, 
        name: "系统时间", 
        metadata: {
            syncStatus: "已同步", 
            hardwareTime: "2023-10-01 11:59:58", 
            startTime: "2023-10-01 08:00:00"
        },
        metadescribe: {
            syncStatus: "同步状态",
            hardwareTime: "硬件时间",
            startTime: "Boot时间",
        }
    },
    { 
        id: 2, 
        name: "IMU", 
        metadata: {
            Roll: "0°", 
            Pitch: "0°", 
            Yaw: "0°"
        },
        metadescribe: {
            Roll: "Roll",
            Pitch: "Pitch",
            Yaw: "Yaw",
        }
    },
    { 
        id: 3, 
        name: "气压计", 
        metadata: {
            pressure: "hPa", 
            altitude: "m"
        },
        metadescribe: {
            pressure: "气压",
            altitude: "海拔",
        }
    },
    {
        id: 4, 
        name: "磁力计", 
        metadata: {
            magneticFieldX: " µT", 
            magneticFieldY: " µT", 
            magneticFieldZ: " µT"
        },
        metadescribe: {
            magneticFieldX: "X 分量",
            magneticFieldY: "Y 分量",
            magneticFieldZ: "Z 分量",
        }
    },
    // { 
    //     id: 5, 
    //     name: "GPS", 
    //     metadata: {
    //         latitude: "未接入", 
    //         longitude: "未接入", 
    //     },
    //     metadescribe: {
    //         latitude: "纬度",
    //         longitude: "经度",
    //     }
    // }
    
]);

interface TimeUpdateData {
    timeUnixUsec: bigint;
    timeBootMs: number;
}

declare global {
    interface ElectronApi {
        onTimeUpdate(callback: (data: TimeUpdateData) => void): void;
        onHighresImu(callback: (data: any) => void): void;
    }
}

window.electronAPI.onTimeUpdate((data: TimeUpdateData) => {
    console.log("onTimeUpdate", data);
    const systemTimeSensor = sensors.find(sensor => sensor.name === "系统时间");
    if (systemTimeSensor) {
        systemTimeSensor.metadata.hardwareTime = new Date(Number(data.timeUnixUsec) / 1000).toLocaleString();
        const hours = Math.floor(data.timeBootMs / 3600000);
        const minutes = Math.floor((data.timeBootMs % 3600000) / 60000);
        const seconds = Math.floor((data.timeBootMs % 60000) / 1000);
        systemTimeSensor.metadata.startTime = `${hours}小时 ${minutes}分钟 ${seconds}秒`;
    }
});
window.electronAPI.onHighresImu((data: any) => {
    //console.log("onHighresImu");
    const imuSensor = sensors.find(sensor => sensor.name === "IMU");
    if (imuSensor) {
        // imuSensor.metadata.acceleration = `${data.acc.x.toFixed(2)}, ${data.acc.y.toFixed(2)}, ${data.acc.z.toFixed(2)} m/s²`;
        // imuSensor.metadata.angularVelocity = `${data.gyro.x.toFixed(3)}, ${data.gyro.y.toFixed(3)}, ${data.gyro.z.toFixed(3)} rad/s`;
        imuSensor.metadata.Roll = `${data.gyro.x.toFixed(1)}°`;
        imuSensor.metadata.Pitch = `${data.gyro.y.toFixed(1)}°`;
        imuSensor.metadata.Yaw = `${data.gyro.z.toFixed(1)}°`;
    }
    const baroSensor = sensors.find(sensor => sensor.name === "气压计");
    if (baroSensor) {
        baroSensor.metadata.pressure = `${data.baro.abs_pressure.toFixed(2)} hPa`;
        baroSensor.metadata.altitude = `${data.baro.pressure_alti.toFixed(1)} m`;
    }
    const magSensor = sensors.find(sensor => sensor.name === "磁力计");
    if (magSensor) {
        magSensor.metadata.magneticFieldX = `${data.mag.x.toFixed(2)} µT`;
        magSensor.metadata.magneticFieldY = `${data.mag.y.toFixed(2)} µT`;
        magSensor.metadata.magneticFieldZ = `${data.mag.z.toFixed(2)} µT`;
    }
});

</script>

<style scoped>
.overview {
    padding: 10px;
}

.sensor-list {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}

.sensor-item {
    text-align: left;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 15px;
    width: 200px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sensor-item h2 {
    margin: 0 0 10px;
    font-size: 18px;
}

.sensor-item p {
    margin: 5px 0;
    font-size: 14px;
}
.sensor-list + .sensor-list {
  margin-top: 30px; /* 两行之间的间隔 */
}

</style>