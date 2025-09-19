<template>
    <div class="page_main_layout">
        <p class="page_title">磁力计校准</p>
        <el-divider />
        <p> 按照以下姿态进行校准，不区分先后顺序</p>

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

        <button @click="startAccCalibration" :disabled="isCalibrating">
            {{ isCalibrating ? 'Calibrating...' : 'Start Calibration' }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { isCalibrating } from '../store/calib';

import mag_back_pic from '../assets/calibration/accel_back.png';
import mag_down_pic from '../assets/calibration/accel_down.png';
import mag_front_pic from '../assets/calibration/accel_front.png';
import mag_left_pic from '../assets/calibration/accel_left.png';
import mag_right_pic from '../assets/calibration/accel_right.png';
import mag_up_pic from '../assets/calibration/accel_up.png';

// 映射方向和图片
const steps = ref([
    { dir: 'POS_X', image: mag_right_pic, status: 'pending' },
    { dir: 'NEG_X', image: mag_left_pic, status: 'pending' },
    { dir: 'POS_Y', image: mag_front_pic, status: 'pending' },
    { dir: 'NEG_Y', image: mag_back_pic, status: 'pending' },
    { dir: 'POS_Z', image: mag_down_pic, status: 'pending' },
    { dir: 'NEG_Z', image: mag_up_pic, status: 'pending' }
]);

// 启动校准
const startAccCalibration = (): void => {
    isCalibrating.value = true;
    steps.value.forEach(s => (s.status = 'pending'));
    const calibrationCommand = {
        params: { gyro: false, acc: false, mag: true, baro: false }
    };
    console.log("Sending calibration command:", calibrationCommand);
    window.electronAPI.triggerCalib(calibrationCommand);
};

// 监听后端消息
onMounted(() => {
    window.electronAPI.onMagCalibUpdate((update: string) => {
        console.log("✅ Received calibration update:", update);

        if (update.startsWith("MAG_CAL:STEP_")) {
            const dir = update.replace("MAG_CAL:STEP_", "");
            const step = steps.value.find(s => s.dir === dir);
            if (step) step.status = "active";
        }

        if (update.startsWith("MAG_CAL:DONE_STEP_")) {
            const dir = update.replace("MAG_CAL:DONE_STEP_", "");
            const step = steps.value.find(s => s.dir === dir);
            if (step) step.status = "done";
        }

        if (update.includes("SUCCESS")) {
            isCalibrating.value = false;
            alert("✅ 磁力计校准成功！");
        }

        if (update.includes("FAIL")) {
            isCalibrating.value = false;
            alert("❌ 磁力计校准失败，请重试！");
        }
    });
});
const cancelCalibration = () => {
    console.log("Calibration cancelled by user.");
    window.electronAPI.cancelCalib();
    isCalibrating.value = false;
    
};

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
