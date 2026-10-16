import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useWalletStore } from '@/core/stores/useWalletStore';
export const usePokerStore = defineStore('poker', () => {
    const phase = ref('WAITING');
    const tableStack = ref(0);
    const pot = ref(0);
    const isSeated = ref(false);
    function sitIn(buyInAmount) {
        const walletStore = useWalletStore();
        if (walletStore.balance < buyInAmount || buyInAmount <= 0) {
            throw new Error('Solde insuffisant dans le Wallet pour ce Buy-in.');
        }
        walletStore.adjustBalance(-buyInAmount);
        tableStack.value = buyInAmount;
        isSeated.value = true;
    }
    function leaveTable() {
        if (!isSeated.value)
            return;
        const walletStore = useWalletStore();
        walletStore.adjustBalance(tableStack.value);
        tableStack.value = 0;
        isSeated.value = false;
        phase.value = 'WAITING';
    }
    return {
        phase,
        tableStack,
        pot,
        isSeated,
        sitIn,
        leaveTable,
    };
});
