import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useWalletStore } from './useWalletStore';
export const useAuthStore = defineStore('auth', () => {
    // Utilisateur mocké par défaut au Jour 1 pour permettre le développement parallèle sans blocage
    const user = ref({
        id: 'demo-player-1',
        username: 'PlayerOne',
        email: 'player1@casino.local',
        balance: 1000,
    });
    const token = ref(localStorage.getItem('casino_jwt_token'));
    const isAuthenticated = computed(() => Boolean(user.value));
    function setAuth(newUser, jwtToken) {
        user.value = newUser;
        token.value = jwtToken;
        localStorage.setItem('casino_jwt_token', jwtToken);
        const walletStore = useWalletStore();
        walletStore.setBalance(newUser.balance);
    }
    function logout() {
        user.value = null;
        token.value = null;
        localStorage.removeItem('casino_jwt_token');
    }
    return {
        user,
        token,
        isAuthenticated,
        setAuth,
        logout,
    };
});
