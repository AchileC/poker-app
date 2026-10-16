import { ref } from 'vue';
import { defineStore } from 'pinia';
// Contrat Frontend (Section 4.3 du Cahier des Charges)
export const useWalletStore = defineStore('wallet', () => {
    const balance = ref(1000); // Solde affiché dans la Navbar (mocké à 1000 jetons par défaut)
    function setBalance(newBalance) {
        balance.value = newBalance;
    }
    function adjustBalance(delta) {
        balance.value += delta;
    }
    return { balance, setBalance, adjustBalance };
});
