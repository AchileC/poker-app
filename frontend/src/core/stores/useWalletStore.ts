import { ref } from 'vue';
import { defineStore } from 'pinia';
import { httpClient } from '@/core/api/httpClient';

// Contrat Frontend (Section 4.3 du Cahier des Charges)
// Le solde affiché est TOUJOURS celui renvoyé par le serveur : chaque action de jeu
// renvoie `newBalance`, que le jeu passe à setBalance. Le front ne calcule jamais de solde.
export const useWalletStore = defineStore('wallet', () => {
  const balance = ref<number>(0); // Solde affiché dans la Navbar

  function setBalance(newBalance: number) {
    balance.value = newBalance;
  }

  async function refresh() {
    const { data } = await httpClient.get<{ balance: number }>('/wallet/balance');
    balance.value = data.balance;
  }

  return { balance, setBalance, refresh };
});
