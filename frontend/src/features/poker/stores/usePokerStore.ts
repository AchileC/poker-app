import { ref } from 'vue';
import { defineStore } from 'pinia';
import { httpClient } from '@/core/api/httpClient';
import { useWalletStore } from '@/core/stores/useWalletStore';

export type PokerTablePhase =
  'WAITING' | 'BLINDS' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

const DEFAULT_TABLE_ID = 'table-1';

export const usePokerStore = defineStore('poker', () => {
  const tableId = ref<string>(DEFAULT_TABLE_ID);
  const phase = ref<PokerTablePhase>('WAITING');
  const tableStack = ref<number>(0);
  const pot = ref<number>(0);
  const isSeated = ref<boolean>(false);

  // Le serveur valide le solde et renvoie newBalance (Section 4.3)
  async function sitIn(buyIn: number) {
    const { data } = await httpClient.post<{ tableStack: number; newBalance: number }>(
      '/poker/sit-in',
      { tableId: tableId.value, buyIn },
    );
    useWalletStore().setBalance(data.newBalance);
    tableStack.value = data.tableStack;
    isSeated.value = true;
  }

  async function leaveTable() {
    if (!isSeated.value) return;
    const { data } = await httpClient.post<{ newBalance: number }>('/poker/leave', {
      tableId: tableId.value,
    });
    useWalletStore().setBalance(data.newBalance);
    tableStack.value = 0;
    isSeated.value = false;
    phase.value = 'WAITING';
  }

  return {
    tableId,
    phase,
    tableStack,
    pot,
    isSeated,
    sitIn,
    leaveTable,
  };
});
