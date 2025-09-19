<template>
    <div class="page_main_layout">
        <p class="page_title">固件烧录</p>
        <el-divider />

        <el-card class="fw-card">
            <div class="row">
                <el-button type="warning" @click="enterDfu" :disabled="isWorking">进入 DFU 模式</el-button>
            </div>
            <div class="row" style="margin-top: 12px;">
                <el-input
                    v-model="firmwarePath"
                    placeholder="请选择固件文件(.bin / .hex )"
                    readonly
                    class="fw-input"
                />
                <el-button type="primary" @click="selectFirmware" :disabled="isWorking">选择固件</el-button>
            </div>

            <div class="row" style="margin-top: 12px;">
                <el-button type="success" @click="flashFirmware" :disabled="!firmwarePath || isWorking">
                {{ isWorking ? '正在发送指令…' : '开始烧录' }}
                </el-button>
            </div>

            <el-alert
                v-if="statusMsg"
                :title="statusMsg"
                :type="statusType"
                :closable="false"
                show-icon
                style="margin-top: 14px;"
            />
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';

const firmwarePath = ref<string | null>(null);

const isWorking = ref(false);
const statusMsg = ref('');
const statusType = ref<'info' | 'success' | 'warning' | 'error'>('info');
const progress = ref(-1);
const flashDone = ref(false);

const enterDfu = () => {
    window.electronAPI.enterDfuMode();
};

const selectFirmware = async () => {
    firmwarePath.value = await window.electronAPI.selectFirmware();
};

const flashFirmware = () => {
    if (firmwarePath.value) {
        progress.value = 0;
        flashDone.value = false;
        window.electronAPI.flashFirmware(firmwarePath.value);
    }
};

onMounted(() => {
    window.electronAPI.onFlashStatus((msg, type) => {
    statusMsg.value = msg;
    statusType.value = type as any;
    isWorking.value = type === "info"; // 烧录中时禁用按钮
    });
});

</script>

<style scoped>
.page_main_layout {
    display: flex;
    flex-direction: column;
    height: 100%;       /* 占满父容器高度 */
    box-sizing: border-box;
    padding: 12px;
}
.fw-card {
    max-width: 720px;
    margin-top: 8px;
    padding: 12px;
}
.row {
    display: flex;
    gap: 10px;
    align-items: center;
}
.fw-input :deep(.el-input__inner) {
    font-family: monospace;
}
</style>
