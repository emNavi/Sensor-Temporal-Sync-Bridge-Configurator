<template>
    <div class="settings-container">
        <el-card>
            <template #header>
                <div class="card-header">
                    <h2>配置</h2>
                </div>
            </template>
            
            <el-form :model="settings" label-position="left" label-width="140px">
                <el-divider content-position="left">帧率设置</el-divider>
                
                <el-form-item label="相机帧率:">
                    <el-slider
                        v-model="settings.camTrigFps"
                        :min="1"
                        :max="120"
                        :step="1"
                        show-input
                        style="width: 300px"
                    ></el-slider>
                </el-form-item>
                
                <el-divider content-position="left">其他设置</el-divider>
                
                <el-form-item>
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
                </el-form-item>
            </el-form>
            
            <el-alert
                v-if="importedFilePath"
                type="info"
                show-icon
                :title="'当前配置文件: ' + importedFilePath"
            ></el-alert>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import yaml from 'js-yaml';  // 需要安装: npm install js-yaml @types/js-yaml

interface Settings {
    camTrigFps: number;
}

const emit = defineEmits<{
    (e: 'settings-updated', settings: Settings): void
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const importedFilePath = ref<string>('');

const settings = reactive<Settings>({
    camTrigFps: 30,
});

onMounted(() => {
    loadSettings();
});

const saveSettings = () => {
    localStorage.setItem('sensorBridgeSettings', JSON.stringify(settings));
    emit('settings-updated', settings);
    ElMessage.success('设置已保存');
};

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
    
    ElMessage.success('设置已导出');
};

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
                const importedSettings = yaml.load(e.target.result as string) as Settings;
                Object.assign(settings, importedSettings);
                saveSettings();
                ElMessage.success('设置已导入');
            }
        } catch (error) {
            ElMessage.error('导入设置失败：无效的设置文件');
            console.error('Failed to import settings:', error);
        }
    };
    reader.readAsText(file);
    
    target.value = '';
};
</script>
