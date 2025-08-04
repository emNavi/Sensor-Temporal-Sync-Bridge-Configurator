// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../components/Overview.vue';
import GyroCalib from '../components/GyroCalib.vue';
import AccCalib from '../components/AccCalib.vue';
import Log from '../components/Log.vue';
import Setting from '../components/Setting.vue';
const routes = [
  {
    path: '/',
    name: 'overview',
    component: HomeView
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

export default router;
