import type { RouteRecordRaw } from 'vue-router';

export const authWalletRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
  },
];
