<template>
    <div class="page_main_layout">
        <p class="page_title">日志</p>
        <el-divider />

        <el-card>
            <!-- 顶部控制栏 -->
            <div class="toolbar">

                <!-- Debug 模式开关 -->
                <div style="display: flex; align-items: center; gap: 8px;">
                    <el-switch
                        v-model="debugMode"
                        active-text="Debug 模式"
                        @change="onDebugModeChange"
                    />
                    <el-tooltip content="Debug 模式会输出更多消息，影响实际使用性能" placement="right">
                        <el-icon style="cursor: pointer; color: orange;">
                            <WarningFilled />
                        </el-icon>
                    </el-tooltip>

                </div>

                <!-- 筛选消息类型（需要开启Debug模式） -->
                <el-checkbox-group
                    v-model="filterCategories"
                    style="margin-left: 20px;"
                    :disabled="!debugMode"
                >
                    <el-checkbox label="IMU">IMU</el-checkbox>
                    <el-checkbox label="CAMERA">相机</el-checkbox>
                    <el-checkbox label="LIDAR">激光雷达</el-checkbox>
                </el-checkbox-group>
                <div style="flex: 1;"></div>
                <el-button
                    type="danger"
                    v-if="showLogs"
                    @click="showLogs = false"
                >停止输出</el-button>

                <el-button
                    type="success"
                    v-else
                    @click="showLogs = true"
                >继续输出</el-button>

            </div>

            <!-- 日志内容 -->
            <div class="log-content">
                <p
                    class="log-font"
                    v-for="(log, index) in filteredLogs"
                    :key="index"
                    :class="log.class"
                >
                    <span>{{ index + 1 }}.</span> {{ log.text }}
                </p>
            </div>

        </el-card>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { WarningFilled } from '@element-plus/icons-vue';

const severityMap = {
    0: { label: "EMERGENCY", class: "log-emergency" },
    1: { label: "ALERT", class: "log-alert" },
    2: { label: "CRITICAL", class: "log-critical" },
    3: { label: "ERROR", class: "log-error" },
    4: { label: "WARNING", class: "log-warning" },
    5: { label: "NOTICE", class: "log-notice" },
    6: { label: "INFO", class: "log-info" },
    7: { label: "DEBUG", class: "log-debug" }
};

// 所有日志
const logs = ref([]);

// 是否显示日志
const showLogs = ref(true);

// Debug 模式（决定是否接收 DEBUG 级别）
const debugMode = ref(false);

// 分类过滤（只用于 DEBUG）
const filterCategories = ref(["IMU", "CAMERA", "LIDAR"]);

const closeDebugMode = () => {
    if (debugMode.value) {
        debugMode.value = false;
        window.electronAPI.enableDebugMode(false);
        ElMessage.info("已自动关闭 Debug 模式");
    }
};

function parseCategory(msg) {
    // 匹配消息开头的 [CAMERA]、[IMU]、[LIDAR]
    const match = msg.match(/^\[(CAMERA|IMU|LIDAR)\]/);
    return match ? match[1] : null;
}
// -------------------------
// 接收 STM32 日志（经由 Electron 主进程）
// -------------------------
onMounted(() => {
    window.electronAPI.onLog((msg, severity) => {

        if (!showLogs.value) return;

        // // ---- 处理 DEBUG 类型日志 ----

        if (severity === 7) {
            if (!debugMode.value) return; // debug 模式关闭时忽略 DEBUG 消息

            const category = parseCategory(msg);
            if (category && !filterCategories.value.includes(category)) {
                return; // 分类过滤
            }
        }
        
        const sev = severityMap[severity] || severityMap[6]; // 默认 INFO
        const finalMsg = `[${sev.label}] ${msg}`;

        logs.value.push({
            text: finalMsg,
            class: sev.class
        });

        // logs.value.push(msg);
        // 自动滚动到底部
        const el = document.querySelector(".log-content");
        if (el) el.scrollTop = el.scrollHeight;
    });
});

// -------------------------
// 开关 Debug 模式
// -------------------------
const onDebugModeChange = (value) => {
    if (value) {
        ElMessage.info("Debug 模式已开启");
        filterCategories.value = ["IMU", "CAMERA", "LIDAR"];
        window.electronAPI.enableDebugMode(true);
    } else {
        ElMessage.info("Debug 模式已关闭");
        window.electronAPI.enableDebugMode(false);
    }
};

onUnmounted(() => {
    closeDebugMode();
});

// -------------------------
// 直接使用完整日志
// -------------------------
const filteredLogs = computed(() => logs.value);

</script>

<style scoped>
.page_main_layout {
    display: flex;
    flex-direction: column;
    height: 100%;       /* 占满父容器高度 */
    box-sizing: border-box;
    padding: 12px;
}
.toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.log-content {
    background-color: #f7f7f7;
    border-radius: 5px;
    height: 55vh;
    overflow-y: auto;
    font-family: monospace;
    padding: 5px 10px;
    white-space: pre-wrap;
    text-align: left; /* 添加左侧对齐 */
}

.log-font {
    font-size: 15px;
    padding: 2px 0;
}

.log-error {
    color: #d9534f;   /* 红色 */
    font-weight: bold;
}

.log-warning {
    color: #f0ad4e;   /* 黄色 */
    font-weight: bold;
}

.log-critical, .log-alert, .log-emergency {
    color: #d43f3a;   /* 深红色 */
    font-weight: bold;
}

.log-info {
    color: #0275d8;   /* 蓝色 */
}

.log-debug {
    color: #777;      /* 灰色 */
}

.log-notice {
    color: #5bc0de;   /* 青色 */
}

</style>
