<template>
  <main class="container">
    <!-- <el-container v-if="store.state.isLoggedIn" class="common-layout" scrolling="no"> -->
    <el-container class="common-layout" scrolling="no">

    <el-aside class="menu" width="200px">
      <Menu />
    </el-aside>
    <el-main style="padding-left: 1px;padding-right: 1px;width: 90vh; ">
      <router-view />
      <!-- for iframe keep alive -->
      <!-- <ShellView v-show="route.path == '/shell'" /> -->
    </el-main>
  </el-container>
  <el-footer class="status-bar" height="30px" style="text-align: center; background-color: #f5f5f5;">
    <span :style="{ color: isConnected ? 'green' : 'red' }">
      {{ isConnected ? '已连接' : '未连接' }}
    </span>
    <p class="version">V{{ version }}-electron-dev</p>
  </el-footer>
  </main>
</template>


<script setup lang="ts">
import viteLogo from './assets/vite.svg';
import vueLogo from './assets/vue.svg';

import HelloWorld from './components/HelloWorld.vue'
import Menu from './components/Menu.vue';
import { version } from '../../package.json';
import { ref } from 'vue';

const isConnected = ref(false); // Change this value to simulate connection status


window.electronAPI.heartBeatStatusMessage((value) => {
  // console.log(value);
  isConnected.value = value;
});
</script>

<style scoped>
.container {
  margin: 0;
  margin-top: 0vh;
  padding-top: 0vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 90vh;
  /* justify-content: center;
  text-align: center; */
}
.version {
  text-align: center;
  margin: 0em;
  font-size: 0.8em;
  color: #797989;

}
.status-bar {
    border-top: 1px solid #dcdcdc;
    font-size: 14px;
    line-height: 30px;
  }
</style>
