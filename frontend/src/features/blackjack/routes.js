export const blackjackRoutes = [
    {
        path: '/blackjack',
        name: 'blackjack',
        component: () => import('./views/BlackjackView.vue'),
    },
];
