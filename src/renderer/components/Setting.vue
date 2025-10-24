<template>
    <div class="settings-container">
        <el-card>
            <el-tabs v-model="activeTab">
                <!-- 板载配置 -->
                    <el-tab-pane label="板载配置" name="board">
                        <el-form :model="boardSettings" label-position="left" label-width="140px">
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
                                <el-radio-group v-model="boardSettings.syncMode">
                                    <el-radio label="internal">同步板Boot时间</el-radio>
                                    <el-radio label="external">上位机系统时间</el-radio>
                                    <el-radio label="gps">GPS时间</el-radio>
                                </el-radio-group>

                                <el-button type="primary" @click="setTimeSyncMode" style="margin-left: 12px;">设置</el-button>
                            </el-form-item>
                        </el-form>
                    </el-tab-pane>

                <!-- 相机配置（原有代码） -->
                <el-tab-pane label="相机配置" name="camera">
                    <el-form :model="settings" label-position="left" label-width="140px">
                        
                        <el-divider content-position="left">相机单次触发</el-divider>

                        <el-form-item label="触发同步脉冲控制:">
                            <!-- <span style="margin-right: 12px;">触发同步脉冲或暂停输出</span> -->
                            <el-button type="primary" @click="triggerSync">触发</el-button>
                            <el-button type="danger" @click="pauseSync">暂停</el-button>
                        </el-form-item>

                        <el-divider content-position="left">帧率设置</el-divider>

                        <el-form-item label="相机帧率:">
                            <el-slider
                                v-model="settings.camTrigFps"
                                :min="1"
                                :max="100"
                                :step="1"
                                show-input
                                style="width: 300px; margin-right: 12px"
                            ></el-slider>
                            <el-button type="primary" @click="applyFps">设置</el-button>
                        </el-form-item>

                        <el-divider content-position="left">其他设置</el-divider>
                        <!-- <el-form-item>
                            <el-button type="primary" @click="saveSettings">保存设置</el-button>
                            <el-button @click="exportSettings">导出设置</el-button>
                            <el-button @click="importSettings">载入设置</el-button>
                            <input
                                type="file"
                                ref="fileInput"
                                style="display: none"
                                accept=".yaml,.yml"
                                @change="handleFileUpload"
                            />
                        </el-form-item> -->
                    </el-form>

                    <el-alert
                        v-if="importedFilePath"
                        type="info"
                        show-icon
                        :title="'当前配置文件: ' + importedFilePath"
                    />
                </el-tab-pane>
            </el-tabs>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useDeviceStore } from '../store/device'; 
import yaml from 'js-yaml'; // npm install js-yaml @types/js-yaml

const deviceStore = useDeviceStore();
// 相机配置
interface CameraSettings {
    camTrigFps: number;
}
// 板载配置
interface BoardSettings {
    syncBoardId: number;
    syncMode: 'internal' | 'external' | 'gps';
}

// 相机同步：单次触发
const triggerSync = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.sendCameraCommand({
        cmd: 'trigger'
    });
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
};

// 相机帧率设置
const applyFps = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.sendCameraCommand({
        cmd: 'set-fps',
        fps: settings.camTrigFps
    });
};

const emit = defineEmits<{
    (e: 'settings-updated', settings: CameraSettings): void;
    (e: 'board-settings-updated', settings: BoardSettings): void;
}>();

// tabs
const activeTab = ref('camera');

// 相机配置
const fileInput = ref<HTMLInputElement | null>(null);
const importedFilePath = ref<string>('');
const settings = reactive<CameraSettings>({
    camTrigFps: 30,
});

// 板载配置
const boardSettings = reactive<BoardSettings>({
    syncBoardId: 1,
    syncMode: 'internal', // 'internal' | 'external' | 'gps'
});

onMounted(() => {
    loadSettings();
});

// 相机配置保存
const saveSettings = () => {
    localStorage.setItem('sensorBridgeSettings', JSON.stringify(settings));
    emit('settings-updated', settings);
    ElMessage.success('相机设置已保存');
};

// 相机配置读取
const loadSettings = () => {
    const savedSettings = localStorage.getItem('sensorBridgeSettings');
    if (savedSettings) {
        try {
            Object.assign(settings, JSON.parse(savedSettings));
        } catch (error) {
            console.error('Failed to parse settings:', error);
        }
    }
};

// 导出相机配置
const exportSettings = () => {
    const yamlStr = yaml.dump(settings);
    const dataBlob = new Blob([yamlStr], { type: 'text/yaml' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sensor-bridge-settings.yaml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success('相机设置已导出');
};

// 导入相机配置
const importSettings = () => {
    if (fileInput.value) {
        fileInput.value.click();
    }
};

const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    importedFilePath.value = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            if (e.target?.result) {
                const importedSettings = yaml.load(e.target.result as string) as CameraSettings;
                Object.assign(settings, importedSettings);
                saveSettings();
                ElMessage.success('相机设置已导入');
            }
        } catch (error) {
            ElMessage.error('导入相机设置失败：无效的文件');
            console.error('Failed to import settings:', error);
        }
    };
    reader.readAsText(file);

    target.value = '';
};
// 保存板载配置
// TODO: stm32 端保存
const saveBoardSettings = () => {
    if (boardSettings.syncBoardId < 1 || boardSettings.syncBoardId > 255) {
        ElMessage.error('同步板 ID 必须在 1 - 255 之间');
        return;
    }
    localStorage.setItem('boardSettings', JSON.stringify(boardSettings));
    emit('board-settings-updated', boardSettings);
    ElMessage.success(`同步板 ID 已设置为 ${boardSettings.syncBoardId}`);
};

const setTimeSyncMode = () => {
    if( !deviceStore.isConnected) {
        ElMessage.error('请先连接设备');
        return;
    }
    window.electronAPI.setTimeSyncMode(boardSettings.syncMode);
    ElMessage.success(`时间源已设置为 ${boardSettings.syncMode}`);
};
</script>
