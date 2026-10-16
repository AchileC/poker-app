import type { RouteRecordRaw } from 'vue-router';

export const blackjackRoutes: RouteRecordRaw[] = [
  {
    path: '/blackjack',
    name: 'blackjack',
    component: () => import('./views/BlackjackView.vue'),
  },
];
