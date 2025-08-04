<template>
    <div class="overview">
        <!-- <h1>传感器总览</h1> -->
        <p class="page_title">传感器状态</p>
        <el-divider/>

        <div class="sensor-list">
            <div v-for="sensor in sensors" :key="sensor.id" class="sensor-item">
                <h2>{{ sensor.name }}</h2>
                <div v-if="Object.keys(sensor.metadata).length">
                    <p v-for="(value, key) in sensor.metadata" :key="key">
                        <span style="display: inline-block; width: 100px; font-weight: bold;">{{ sensor.metadescribe[key] }}:</span> 
                        <span>{{ value }}</span>
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

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
            orientation: "北偏东30°", 
            acceleration: "9.8 m/s²", 
            angularVelocity: "0.02 rad/s"
        },
        metadescribe: {
            orientation: "方向",
            acceleration: "加速度",
            angularVelocity: "角速度",
        }
    },
    { 
        id: 3, 
        name: "气压计", 
        type: "压力", 
        status: "正常", 
        value: "101.3 kPa", 
        metadata: {}
    }
]);

interface TimeUpdateData {
    timeUnixUsec: bigint;
    timeBootMs: number;
}

declare global {
    interface ElectronApi {
        onTimeUpdate(callback: (data: TimeUpdateData) => void): void;
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


</style>