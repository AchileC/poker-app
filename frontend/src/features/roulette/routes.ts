import type { RouteRecordRaw } from 'vue-router';

export const rouletteRoutes: RouteRecordRaw[] = [
  {
    path: '/roulette',
    name: 'roulette',
    component: () => import('./views/RouletteView.vue'),
  },
];
