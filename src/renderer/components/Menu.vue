<template>
<el-aside width="200px" style="background-color: #f2f2f2; padding: 10px; height: 80vh;">
    <el-menu 
        default-active="1" 
        class="el-menu-vertical-demo" 
        @select="handleMenuSelect"
    >
        <el-menu-item index="1">
            <el-icon><SuccessFilled /></el-icon>
            <span>总览</span>
        </el-menu-item>
        <el-menu-item index="2">
            <el-icon><WarningFilled /></el-icon>
            <span>Gyro校准</span>
        </el-menu-item>
        <el-menu-item index="3">
            <el-icon><WarningFilled /></el-icon>
            <span>Acc校准</span>
        </el-menu-item>
        <el-menu-item index="4">
            <el-icon><CircleCloseFilled /></el-icon>
            <span>Log</span>
        </el-menu-item>
        <el-menu-item index="5">
            <el-icon><CircleCloseFilled /></el-icon>
            <span>设置</span>
        </el-menu-item>
    </el-menu>
</el-aside>

</template>
<script setup>
import { ref, onMounted } from 'vue';
import { SuccessFilled, WarningFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { de } from 'element-plus/es/locales.mjs';
import { ElNotification } from 'element-plus'


import { useRouter } from 'vue-router';

const router = useRouter();

const handleMenuSelect = (index) => {
    switch (index) {
        case '1':
            router.push('/');
            break;
        case '2':
            router.push('/gyro_calib');
            break;
        case '3':
            router.push('/acc_calib');
            break;
        case '4':
            router.push('/log');
            break;
        case '5':
            router.push('/setting');
            break;
        default:
            ElNotification({
                title: '未知菜单',
                message: '未识别的菜单选项',
                type: 'info',
            });
    }
};
// window.electronAPI.onUpdateNetDevices((value) => {
//     devicesList.value = JSON.parse(value);
//     console.log("onUpdateNetDevices",value);
// })

// window.electronAPI.onUpdateNetcardIps((value) => {
//     ipRanges = JSON.parse(value);
//     console.log("onUpdateNetcardIps",value);
// })

// document.addEventListener('keydown', (event) => {
//   if (event.key === 'F5' || (event.ctrlKey && event.key === 'r') || (event.metaKey && event.key === 'r')) {
//     event.preventDefault();
//   }
// });

</script>

<style>
.el-table .success-row {
    /* --el-table-tr-bg-color: var(--el-color-warning-light-9); */
    --el-table-tr-bg-color: #45553d96;
}
</style>