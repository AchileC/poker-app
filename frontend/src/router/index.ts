import { createRouter, createWebHistory } from 'vue-router';
import { homeRoutes } from '@/features/home/routes';
import { authWalletRoutes } from '@/features/auth-wallet/routes';
import { pokerRoutes } from '@/features/poker/routes';
import { blackjackRoutes } from '@/features/blackjack/routes';
import { rouletteRoutes } from '@/features/roulette/routes';
import { crashRoutes } from '@/features/crash/routes';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...homeRoutes,
    ...authWalletRoutes,
    ...pokerRoutes,
    ...blackjackRoutes,
    ...rouletteRoutes,
    ...crashRoutes,
  ],
});
