import type { RouteRecordRaw } from 'vue-router';

export const pokerRoutes: RouteRecordRaw[] = [
  {
    path: '/poker',
    name: 'poker',
    component: () => import('./views/PokerView.vue'),
  },
];
