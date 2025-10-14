<template>
  <main class="container">
    <el-container class="common-layout" scrolling="no">
      <el-aside class="menu" width="200px">
        <Menu />
      </el-aside>
      <el-main style="padding-left: 1px; padding-right: 1px; width: 90vh;">
        <router-view />
      </el-main>
    </el-container>

    <!-- 底部状态栏：设备选择 & 连接控制 -->
    <el-footer
      class="status-bar"
      height="40px"
      style="display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; gap: 10px;"
    >
      <!-- 未连接 -->
      <div v-if="!deviceStore.isConnected" style="display: flex; align-items: center; gap: 10px;">
        <span style="color: red;">未连接</span>
        <el-select
          v-model="selectedPort"
          placeholder="选择设备"
          size="small"
          style="width: 200px;"
          @visible-change="onDropdownVisible"
        >
          <el-option
            v-for="port in ports"
            :key="port.path"
            :label="port.friendlyName || port.path"
            :value="port.path"
          />
        </el-select>
        <el-button type="primary" size="small" :disabled="!selectedPort" @click="connectDevice">
          连接
        </el-button>
      </div>

      <!-- 已连接 -->
      <div v-else style="display: flex; align-items: center; gap: 10px;">
        <!-- 连接后显示端口和设备 ID -->
        <span style="color: green;">
          已连接设备：{{ deviceStore.connectedPort }} 
          <template v-if="deviceStore.deviceId"> (ID: {{ deviceStore.deviceId }})</template>
        </span>
        <el-button type="danger" size="small" @click="disconnectDevice">断开</el-button>
      </div>

      <!-- 固件版本 -->
      <p class="version">V{{ version }}-electron-dev</p>
    </el-footer>
  </main>
</template>

<script setup lang="ts">
import Menu from './components/Menu.vue';
import { version } from '../../package.json';
import { ref, onMounted } from 'vue';
import { useDeviceStore } from './store/device';

const deviceStore = useDeviceStore();
const isConnected = ref(false);          // 心跳更新
const ports = ref<{ path: string; friendlyName?: string }[]>([]);
const selectedPort = ref('');
const connectedPort = ref('');
const deviceId = ref<number | null>(null); // 设备 ID

// 点击连接按钮 -> 发送命令给主进程
const connectDevice = () => {
  if (!selectedPort.value) return;
  window.electronAPI.connectPort(selectedPort.value);
};

// 点击断开按钮 -> 发送命令给主进程
const disconnectDevice = () => {
  window.electronAPI.disconnectPort();
};

// 下拉框展开时刷新端口列表
const onDropdownVisible = async (visible: boolean) => {
  if (visible) {
    try {
      ports.value = await window.electronAPI.listPorts();
    } catch (err) {
      console.error('刷新设备列表失败:', err);
    }
  }
};

// 初始化：获取一次端口列表
onMounted(async () => {
  try {
    ports.value = await window.electronAPI.listPorts();
  } catch (err) {
    console.error('获取设备列表失败:', err);
  }

  // 监听心跳状态，更新连接状态
  window.electronAPI.heartBeatStatusMessage((value: boolean) => {
    deviceStore.setConnection(value, selectedPort.value || '', deviceStore.deviceId);
  });
  // 监听 heartbeat，获取设备 ID
  window.electronAPI.onHeartbeat((data: { id: number }) => {
    deviceStore.deviceId = data.id;
  });
  // 断开事件
  window.electronAPI.onDeviceDisconnected(() => {
    deviceStore.disconnect();
    selectedPort.value = '';
  });
});
</script>

<style scoped>
.container {
  margin: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 90vh;
}
.version {
  margin-left: 20px;
  font-size: 0.8em;
  color: #797989;
}
.status-bar {
  border-top: 1px solid #dcdcdc;
  font-size: 14px;
  line-height: 30px;
}
</style>
