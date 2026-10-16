import { ref } from 'vue';
import { defineStore } from 'pinia';

// Contrat Frontend (Section 4.3 du Cahier des Charges)
export const useWalletStore = defineStore('wallet', () => {
  const balance = ref<number>(1000); // Solde affiché dans la Navbar (mocké à 1000 jetons par défaut)

  function setBalance(newBalance: number) {
    balance.value = newBalance;
  }

  function adjustBalance(delta: number) {
    balance.value += delta;
  }

  return { balance, setBalance, adjustBalance };
});
