import type { RouteRecordRaw } from 'vue-router';

export const crashRoutes: RouteRecordRaw[] = [
  {
    path: '/crash',
    name: 'crash',
    component: () => import('./views/CrashView.vue'),
  },
];
