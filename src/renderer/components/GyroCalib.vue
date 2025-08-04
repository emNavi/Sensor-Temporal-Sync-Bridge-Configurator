<template>
    <div class="page_main_layout">
        <p class="page_title">Gyroscope Calibration</p>
        <el-divider/>

        <p> 按照以下姿态进行校准，不区分先后顺序</p>
        <el-row :gutter="20">
            <el-col v-for="(step, index) in steps" :key="index" :span="8">
                <img :src="step.image" :alt="step.title" style="width: 30.3vh; border: 3px solid gray; border-radius: 10px;" />
            </el-col>
        </el-row>

        <button @click="startGyroCalibration" :disabled="isCalibrating">
            {{ isCalibrating ? 'Calibrating...' : 'Start Calibration' }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import accel_back_pic from '../assets/calibration/accel_back.png';
import accel_down_pic from '../assets/calibration/accel_down.png';
import accel_front_pic from '../assets/calibration/accel_front.png';
import accel_left_pic from '../assets/calibration/accel_left.png';
import accel_right_pic from '../assets/calibration/accel_right.png';
import accel_up_pic from '../assets/calibration/accel_up.png';


const isCalibrating = ref(false);
const steps = ref([
    {
        title: "Place Down",
        image: accel_down_pic,
    },
    
]);
const imageModules = import.meta.glob('./assets/calibration/*', {
  eager: true,
  as: 'url'
});
function getImageUrl(filename: string): string | undefined {
  const fullPath = `/src/assets/calibration/${filename}`;
  console.log(fullPath);
  console.log(imageModules[fullPath]);
  return imageModules[fullPath];
}

const startGyroCalibration = (): void => {
    isCalibrating.value = true;
    // Simulate calibration process
    const calibrationCommand = {
        params: {
            gyro: true,
            accel: false,
            mag: false,
            baro: false,
        },
    };
    // console.log("Sending calibration command:", calibrationCommand);
    // window.electronAPI.sendCommand(calibrationCommand);
    window.electronAPI.triggerCalib(calibrationCommand);
    setTimeout(() => {
        isCalibrating.value = false;
        alert("Calibration Complete!");
    }, 3000);
};
</script>

<style scoped>
.gyro-calib {
    text-align: center;
    padding: 5px;
    padding-left: 20px;
    width: 100%;

}

.calibration-steps {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin: 20px 0;
}

.step {
    text-align: center;
}

.step img {
    width: 100px;
    height: 100px;
    object-fit: contain;
}

button {
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
}


.el-row {
  margin-bottom: 20px;
}
.el-row:last-child {
  margin-bottom: 0;
}
.el-col {
  border-radius: 4px;
}

.grid-content {
  border-radius: 4px;
  min-height: 36px;
}
</style>