<template>
    <div class="page_main_layout">
        <p class="page_title">日志</p>
        <el-divider />
        <el-card>
            <div class="log-container">
                <el-button type="danger" v-if="show_log_flag" @click="() => { show_log_flag = false; }">停止输出</el-button>
                <el-button type="success" v-else @click="() => { show_log_flag = true; }">继续输出</el-button>
                <div class="log-content">
                    <p class="log-font" v-for="(log, index) in logs" :key="index">
                        <span>{{ index + 1 }}. </span>{{ log }}
                    </p>
                </div>
            </div>
        </el-card>
    </div>

</template>

<script setup>
import { ref, onMounted } from 'vue';

const logs = ref([]);
const show_log_flag = ref(true);


// 监听主进程发送的日志
onMounted(() => {
    window.electronAPI.onLog((value) => {
        // 滚动到最新日志
        if (show_log_flag.value) {
            logs.value.push(value);
            const logContainer = document.querySelector('.log-content');
            if (logContainer) {
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
    }
    );
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
.log-container {
    padding: 10px;
    width: 100%;
}

.log-content {
    /* margin-top: 10px; */
    text-align: left;
    text-rendering: auto;

    background-color: #f7f7f7;
    padding: 0px;
    border-radius: 5px;
    height: 55vh;
    overflow-y: auto;
    font-family: monospace;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.log-font {
    font-size: 20px;
    color: #333;
    margin: 0;
    padding: 5px 0;
}
</style>