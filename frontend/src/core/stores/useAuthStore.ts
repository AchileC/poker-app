import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { User } from '@/core/types';
import { httpClient, TOKEN_STORAGE_KEY } from '@/core/api/httpClient';
import { disconnectSocketClient } from '@/core/api/socketClient';
import { useWalletStore } from './useWalletStore';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
  const isAuthenticated = computed(() => Boolean(user.value));

  function setAuth(newUser: User, jwtToken: string) {
    user.value = newUser;
    token.value = jwtToken;
    localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
    disconnectSocketClient(); // les sockets se reconnecteront avec le nouveau token

    useWalletStore().setBalance(newUser.balance);
  }

  async function login(username: string) {
    const { data } = await httpClient.post<{ user: User; token: string }>('/auth/login', {
      username,
    });
    setAuth(data.user, data.token);
  }

  /**
   * Restaure la session au démarrage de l'app.
   * Jour 1 (auth bouchonnée) : sans token valide, connexion automatique en « PlayerOne »
   * pour que chaque jeu soit utilisable immédiatement. Le Dev 2 remplacera ce fallback
   * par une redirection vers /login.
   */
  async function restoreSession() {
    if (token.value) {
      try {
        const { data } = await httpClient.get<User>('/auth/me');
        user.value = data;
        useWalletStore().setBalance(data.balance);
        return;
      } catch {
        logout();
      }
    }
    await login('PlayerOne');
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    disconnectSocketClient();
  }

  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    login,
    restoreSession,
    logout,
  };
});
