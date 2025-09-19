// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../components/Overview.vue';
import Firmware from '../components/Firmware.vue';
import GyroCalib from '../components/GyroCalib.vue';
import AccCalib from '../components/AccCalib.vue';
import Log from '../components/Log.vue';
import Setting from '../components/Setting.vue';
import MagCalib from '../components/MagCalib.vue';
import { ElMessageBox } from 'element-plus';
import { isCalibrating } from '../store/calib';

const routes = [
  {
    path: '/',
    name: 'overview',
    component: HomeView
  },
  {
    path: '/firmware',
    name: 'firmware',
    component: Firmware
  },
  {
    path: '/gyro_calib',
    name: 'gyrocalib',
    component: GyroCalib
  },
  {
    path: "/acc_calib",
    name: "acccalib",
    component: AccCalib
  },
  {
    path: "/mag_calib",
    name: "magcalib",
    component: MagCalib
  },
  {
    path: "/log",
    name: "log",
    component: Log
  },
  {
    path: "/setting",
    name: "setting",
    component: Setting
  }
//   {
//     path: '/about',
//     name: 'about',
//     component: AboutView
//   }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  if (isCalibrating.value) {
    try {
      await ElMessageBox.confirm(
        '正在校准中，确认退出？数据将不被保存！',
        '提示',
        {
          confirmButtonText: '退出',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      // 用户确认退出 → 通知后端取消校准
      window.electronAPI.cancelCalib?.();
      isCalibrating.value = false;

      next(); // 放行
    } catch {
      next(false); // 取消路由跳转
    }
  } else {
    next(); // 正常跳转
  }
});

export default router;
