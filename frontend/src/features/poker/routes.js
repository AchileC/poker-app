export const pokerRoutes = [
    {
        path: '/poker',
        name: 'poker',
        component: () => import('./views/PokerView.vue'),
    },
];
