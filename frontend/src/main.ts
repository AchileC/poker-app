import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './style.css';

import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './core/stores/useAuthStore';

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
  },
});

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(vuetify);

app.mount('#app');

void useAuthStore().restoreSession();
