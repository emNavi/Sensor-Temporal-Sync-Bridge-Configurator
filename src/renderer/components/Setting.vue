<template>
    <div class="settings-container">
        <el-card>
            <el-tabs v-model="activeTab">
                <!-- 板载配置 -->
                    <el-tab-pane label="板载配置" name="board">
                        <el-form :model="settingsStore" label-position="left" label-width="140px">
                            <el-divider content-position="left">ID 设置</el-divider>

                            <el-form-item label="同步板 ID:">
                            <!-- <el-input-number
                                v-model="boardSettings.syncBoardId"
                                :min="1"
                                :max="255"
                                :step="1"
                                style="width: 120px; margin-right: 12px"
                            />

                            <el-button type="primary" @click="saveBoardSettings">设置</el-button> -->
                            </el-form-item>

                            <el-divider content-position="left">同步方式设置</el-divider>

                            <el-form-item label="时间源:">
                                <el-radio-group v-model="settingsStore.syncMode">
                                    <el-radio label="internal">同步板Boot时间</el-radio>
                                    <el-radio label="external">上位机系统时间</el-radio>
                                    <el-radio label="gps">GPS时间</el-radio>
                                </el-radio-group>

                                <el-button type="primary" @click="setTimeSyncMode" style="margin-left: 12px;">设置</el-button>
                            </el-form-item>
                        </el-form>
                    </el-tab-pane>

                <el-tab-pane label="相机配置" name="camera">
                    <el-form :model="settingsStore" label-position="left" label-width="140px">
                        
                        <el-divider content-position="left">相机单次触发</el-divider>

                        <el-form-item label="触发同步脉冲控制:">
                            <!-- <span style="margin-right: 12px;">触发同步脉冲或暂停输出</span> -->
                            <el-button type="primary" @click="triggerSync">触发</el-button>
                            <el-button type="danger" @click="pauseSync">暂停</el-button>
                        </el-form-item>

                        <el-divider content-position="left">帧率设置</el-divider>

                        <el-form-item label="相机帧率:">
                            <el-slider
                                v-model="settingsStore.camTrigFps"
                                :min="1"
                                :max="100"
                                :step="1"
                                show-input
                                style="width: 300px; margin-right: 12px"
                            ></el-slider>
                            <el-button type="primary" @click="applyFps">设置</el-button>
                        </el-form-item>
                        <el-divider content-position="left">其他设置</el-divider>
                    </el-form>
                </el-tab-pane>
            </el-tabs>
        </el-card>
        <!-- 底部操作区 -->
        <div class="bottom-actions">
            <el-button type="info" @click="requestDeviceParams">
                读取配置
            </el-button>

            <el-button type="warning" @click="rebootDevice">
                重启
            </el-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useDeviceStore } from '../store/device'; 
import { useSettingsStore } from '../store/settings';

let removeParamListener: (() => void) | null = null;

const deviceStore = useDeviceStore();
const settingsStore = useSettingsStore();
// tabs
const activeTab = ref('camera');

// 相机同步：单次触发
const triggerSync = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.sendCameraCommand({
        cmd: 'trigger'
    });
    ElMessage.success(`单次触发`);
};

// 相机同步：暂停
const pauseSync = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.sendCameraCommand({
        cmd: 'pause'
    });
    ElMessage.success(`已暂停`);
};

// 相机帧率设置
const applyFps = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.sendCameraCommand({
        cmd: 'set-fps',
        fps: settingsStore.camTrigFps
    });
    ElMessage.success(`帧率设置为 ${settingsStore.camTrigFps}`);
};

const rebootDevice = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.rebootDevice();
    ElMessage.info('正在重启设备...');
};

const requestDeviceParams = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.requestParam(0);
    ElMessage.info('正在读取设备配置...');
};

const initParamListener = () => {
    removeParamListener = window.electronAPI.onParamValue((msg) => {

        if (msg.paramId === 'CAM_TRIGGER_FPS') {
            settingsStore.camTrigFps = msg.paramValue;
            ElMessage.success('相机帧率读取成功');
        }
        else if (msg.paramId === 'TIME_SYNC_MODE') {
            settingsStore.syncMode =
                msg.paramValue === 2 ? 'gps' :
                msg.paramValue === 1 ? 'external' :
                'internal';
            ElMessage.success('时间同步模式读取成功');
        }

        settingsStore.paramsLoaded = true;
    });
};

const autoRequestParams = () => {
    if (deviceStore.isConnected && !settingsStore.paramsLoaded) {
        requestDeviceParams();
    }
};

onMounted(() => {
    initParamListener();
    autoRequestParams();
});

onUnmounted(() => {
    if (removeParamListener) {
        removeParamListener();
        removeParamListener = null;
    }
});


// 保存板载配置
// TODO: stm32 端保存
// const saveBoardSettings = () => {
//     if (boardSettings.syncBoardId < 1 || boardSettings.syncBoardId > 255) {
//         ElMessage.error('同步板 ID 必须在 1 - 255 之间');
//         return;
//     }
//     localStorage.setItem('boardSettings', JSON.stringify(boardSettings));
//     emit('board-settings-updated', boardSettings);
//     ElMessage.success(`同步板 ID 已设置为 ${boardSettings.syncBoardId}`);
// };

const setTimeSyncMode = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.setTimeSyncMode(settingsStore.syncMode);
    ElMessage.success(`时间源已设置为 ${settingsStore.syncMode}`);
};
</script>

<style scoped>

.settings-container {
    display: flex;
    flex-direction: column;
}

.bottom-actions {
    display: flex;
    justify-content: flex-end;   /* 右对齐 */
    gap: 12px;
    margin-top: 24px;            /* 和 card 空一行 */
}

</style>
