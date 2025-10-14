<template>
    <div class="page_main_layout">
        <p class="page_title">陀螺仪校准</p>
        <el-divider />
        <p> 请水平放置设备，点击按钮开始校准 </p>
        
        <el-row :gutter="20">
            <el-col v-for="(step, index) in steps" :key="index" :span="8">
                <img
                    :src="step.image"
                    class="calib-img"
                    :class="{
                        'calib-pending': step.status === 'pending',
                        'calib-active': step.status === 'active',
                        'calib-done': step.status === 'done'
                    }"
                />
                <p style="text-align: center;">{{ step.title }}</p>
            </el-col>
        </el-row>

        <button @click="startGyroCalibration" :disabled="isCalibrating">
            {{ isCalibrating ? 'Calibrating...' : 'Start Calibration' }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '../store/device'

import accel_down_pic from '../assets/calibration/accel_down.png'

const deviceStore = useDeviceStore()
const isCalibrating = ref(false)
const steps = ref([
    { dir: '水平放置', image: accel_down_pic, status: 'pending' as 'pending' | 'active' | 'done' },
])

/** 启动校准 */
const startGyroCalibration = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    isCalibrating.value = true
    steps.value.forEach(s => (s.status = 'pending'))

    const calibrationCommand = {
        params: { gyro: true, acc: false, mag: false, baro: false },
    }
    console.log('Sending calibration command:', calibrationCommand)
    window.electronAPI.triggerCalib(calibrationCommand)
}

onMounted(() => {
    window.electronAPI.onGyroCalibUpdate(handleUpdate)
})

/** 提取更新逻辑，避免重复注册 */
const handleUpdate = (update: string) => {
    console.log('✅ Received calibration update:', update)

    if (update.startsWith('GYRO_CAL:START')) {
        steps.value[0].status = 'active'
    }

    if (update.startsWith('GYRO_CAL:DONE')) {
        steps.value[0].status = 'done'
    }

    if (update.includes('SUCCESS')) {
        isCalibrating.value = false
        alert('✅ 陀螺仪校准成功！')
    }

    if (update.includes('FAIL')) {
        isCalibrating.value = false
        steps.value[0].status = 'pending'
        alert('❌ 陀螺仪校准失败，请重试！')
    }
}
onBeforeUnmount(() => {
  // 确保移除监听，避免重复触发
    window.electronAPI.removeGyroCalibUpdateListener?.()
})

</script>

<style scoped>
.page_main_layout {
    display: flex;
    flex-direction: column;
    height: 100%;       /* 占满父容器高度 */
    box-sizing: border-box;
    padding: 12px;
}
.calib-img {
    width: 30.3vh;
    border: 3px solid gray;
    border-radius: 10px;
    transition: border-color 0.5s ease;
}
.calib-pending {
    border-color: rgb(243, 35, 35);
}
.calib-active {
    border-color: orange;
}
.calib-done {
    border-color: green;
}
</style>
