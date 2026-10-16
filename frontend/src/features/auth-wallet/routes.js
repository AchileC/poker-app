export const authWalletRoutes = [
    {
        path: '/login',
        name: 'login',
        component: () => import('./views/LoginView.vue'),
    },
];
