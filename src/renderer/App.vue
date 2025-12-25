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

    <!-- 底部状态栏：固定在底部 -->
    <el-footer class="status-bar" height="40px">
      <!-- 左侧空区域（用于布局平衡） -->
      <div class="status-left"></div>
      
      <!-- 中间：连接状态 -->
      <div class="status-center">
        <div v-if="!deviceStore.isConnected" class="connection-section">
          <span class="status-text error">未连接</span>
          <el-select
            v-model="selectedPort"
            placeholder="选择设备"
            size="small"
            style="width: 200px"
            @visible-change="onDropdownVisible"
          >
            <el-option
              v-for="port in ports"
              :key="port.path"
              :label="port.friendlyName || port.path"
              :value="port.path"
            />
          </el-select>
          <el-button
            type="primary"
            size="small"
            :disabled="!selectedPort"
            @click="connectDevice"
          >
            连接
          </el-button>
        </div>

        <div v-else class="connection-section">
          <span class="status-text success">
            已连接设备：{{ deviceStore.connectedPort }}
            <template v-if="deviceStore.deviceId">
              (ID: {{ deviceStore.deviceId }})
            </template>
          </span>
          <el-button type="danger" size="small" @click="disconnectDevice">
            断开
          </el-button>
        </div>
      </div>

      <!-- 右侧：版本号和主题切换 -->
      <div class="status-right">
        <span class="version">V{{ version }}-sensor-bridge</span>
        <el-button
          size="small"
          circle
          @click="themeStore.toggle"
          :title="themeStore.mode === 'dark'
            ? '切换到白天模式'
            : '切换到黑夜模式'"
          class="theme-toggle"
        >
          <el-icon>
            <Moon v-if="themeStore.mode === 'dark'" />
            <Sunny v-else />
          </el-icon>
        </el-button>
      </div>
    </el-footer>
  </main>
</template>

<script setup lang="ts">
import Menu from './components/Menu.vue';
import { version } from '../../package.json';
import { ref, onMounted } from 'vue';
import { useDeviceStore } from './store/device';
import { useThemeStore } from './store/theme'
import { Moon, Sunny } from '@element-plus/icons-vue'
const themeStore = useThemeStore();
const deviceStore = useDeviceStore();
const ports = ref<{ path: string; friendlyName?: string }[]>([]);
const selectedPort = ref('');


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
  themeStore.setMode(themeStore.mode)
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
  /* background-color: var(--el-bg-color); */
}

.common-layout {
  flex: 1;
}

/* 底部状态栏 - 恢复原来样式 */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 40px;
  
  border-top: 1px solid var(--el-border-color);
  background-color: var(--el-bg-color);
  font-size: 14px;
}

/* 左侧区域（保持布局平衡） */
.status-left {
  width: 120px;
}

/* 中间区域：连接状态 */
.status-center {
  display: flex;
  justify-content: center;
  flex: 1;
}

.connection-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 状态文本 */
.status-text {
  font-size: 14px;
}

.status-text.success {
  color: var(--el-color-success);
}

.status-text.error {
  color: var(--el-color-danger);
}

/* 右侧区域：版本号和主题切换 */
.status-right {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 160px;
  justify-content: flex-end;
}

.version {
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
}

.theme-toggle {
  margin-left: 5px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .status-bar {
    padding: 0 12px;
  }
  
  .connection-section {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  
  .status-left,
  .status-right {
    width: 60px;
  }
}
</style>
