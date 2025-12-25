<template>
    <el-aside width="200px" class="side-menu">
        <el-menu 
            :default-active="route.path"   
            class="el-menu-vertical-demo"
            router                        
        >
            <el-menu-item index="/">
                <el-icon><House /></el-icon>
                <span>总览</span>
            </el-menu-item>
            <el-menu-item index="/firmware">
                <el-icon><Switch /></el-icon>
                <span>固件</span>
            </el-menu-item>
            <el-menu-item index="/gyro_calib">
                <el-icon><Aim /></el-icon>
                <span>Gyro校准</span>
            </el-menu-item>
            <el-menu-item index="/acc_calib">
                <el-icon><Aim /></el-icon>
                <span>Acc校准</span>
            </el-menu-item>
            <!-- <el-menu-item index="/mag_calib">
                <el-icon><Aim /></el-icon>
                <span>Mag校准</span>
            </el-menu-item> -->
            <el-menu-item index="/log">
                <el-icon><ChatDotSquare /></el-icon>
                <span>Log</span>
            </el-menu-item>
            <el-menu-item index="/setting">
                <el-icon><SetUp /></el-icon>
                <span>配置</span>
            </el-menu-item>
        </el-menu>
    </el-aside>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { House, Switch, SuccessFilled, WarningFilled, CircleCloseFilled, Aim, ChatDotSquare, SetUp } from '@element-plus/icons-vue'
import { ElNotification } from 'element-plus'


import { useRouter } from 'vue-router';

const route = useRoute()

const handleMenuSelect = (index) => {
    switch (index) {
        case '1':
            router.push('/');
            break;
        case '3':
            router.push('/gyro_calib');
            break;
        case '2':
            router.push('/firmware');
            break;
        case '4':
            router.push('/acc_calib');
            break;
        case '5':
            router.push('/mag_calib');
            break;
        case '6':
            router.push('/log');
            break;
        case '7':
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
    --el-table-tr-bg-color: var(--el-color-success-light-9);
}
.side-menu-inner {
    background-color: transparent;
    border-right: none;
}
.side-menu {
    padding: 10px;
    height: 80vh;
    background-color: var(--el-bg-color);
    border-right: 1px solid var(--el-border-color);
}
</style>