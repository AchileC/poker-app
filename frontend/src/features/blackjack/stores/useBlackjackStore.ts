import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { httpClient, toApiError } from '@/core/api/httpClient';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { useWalletStore } from '@/core/stores/useWalletStore';
import type { BlackjackAction, RoundResponse, RoundView, TableRules, TableType } from '../types';

export const CHIP_VALUES = [5, 25, 100, 500] as const;

export const useBlackjackStore = defineStore('blackjack', () => {
  const tables = ref<TableRules[]>([]);
  const selectedTable = ref<TableType>('VEGAS');
  const round = ref<RoundView | null>(null);
  const bet = ref(0);
  const isBusy = ref(false);
  const error = ref<string | null>(null);

  const rules = computed(() => tables.value.find((t) => t.table === selectedTable.value) ?? null);
  const isPlaying = computed(() => round.value !== null && round.value.phase !== 'SETTLED');

  function applyResponse(response: RoundResponse) {
    round.value = response.round;
    // Le solde vient toujours du serveur (CDC §4.3)
    useWalletStore().setBalance(response.newBalance);
  }

  async function run(task: () => Promise<void>) {
    isBusy.value = true;
    error.value = null;
    try {
      await task();
    } catch (err) {
      const apiError = toApiError(err);
      error.value = apiError.message;
      if (apiError.code === 'BLACKJACK_STALE_STATE') {
        await loadCurrent();
      }
    } finally {
      isBusy.value = false;
    }
  }

  async function loadCurrent() {
    const { data } = await httpClient.get<RoundResponse>('/blackjack/rounds/current');
    applyResponse(data);
    if (data.round) {
      selectedTable.value = data.round.rules.table;
    }
  }

  /** Charge les tables et reprend une éventuelle partie en cours (refresh, reconnexion). */
  function init() {
    return run(async () => {
      await useAuthStore().ready();
      const { data } = await httpClient.get<TableRules[]>('/blackjack/tables');
      tables.value = data;
      await loadCurrent();
    });
  }

  function addChip(value: number) {
    const max = rules.value?.maxBet ?? Infinity;
    bet.value = Math.min(bet.value + value, max);
  }

  function clearBet() {
    bet.value = 0;
  }

  function deal() {
    return run(async () => {
      const { data } = await httpClient.post<RoundResponse>('/blackjack/rounds', {
        table: selectedTable.value,
        bet: bet.value,
      });
      applyResponse(data);
    });
  }

  function act(action: BlackjackAction) {
    const current = round.value;
    if (!current) return Promise.resolve();
    return run(async () => {
      const { data } = await httpClient.post<RoundResponse>(
        `/blackjack/rounds/${current.id}/actions`,
        { action, version: current.version },
      );
      applyResponse(data);
    });
  }

  return {
    tables,
    selectedTable,
    round,
    bet,
    isBusy,
    error,
    rules,
    isPlaying,
    init,
    addChip,
    clearBet,
    deal,
    act,
  };
});
