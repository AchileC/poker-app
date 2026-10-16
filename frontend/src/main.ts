import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './styles/tailwind.css';

import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './core/stores/useAuthStore';
import { casinoTheme } from './core/theme/casinoTheme';

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'casino',
    themes: { casino: casinoTheme },
  },
});

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(vuetify);

app.mount('#app');

void useAuthStore().restoreSession();
