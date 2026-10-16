<script setup lang="ts">
import { ref } from 'vue';
import { usePokerStore } from '../stores/usePokerStore';
import { useWalletStore } from '@/core/stores/useWalletStore';
import { toApiError } from '@/core/api/httpClient';

const pokerStore = usePokerStore();
const walletStore = useWalletStore();
const buyInInput = ref<number>(500);
const errorMessage = ref<string | null>(null);

async function runAction(action: () => Promise<void>) {
  errorMessage.value = null;
  try {
    await action();
  } catch (err) {
    errorMessage.value = toApiError(err).message;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4"
    >
      <div>
        <span class="text-xs font-mono text-emerald-400"
          >Périmètre Dev 1 (Achile) • Texas Hold'em No-Limit (6-max)</span
        >
        <h1 class="text-2xl font-bold text-white mt-1">Table de Poker Cash Game</h1>
      </div>

      <div class="flex items-center gap-3">
        <v-chip color="emerald" variant="tonal" size="small">
          État : {{ pokerStore.phase }}
        </v-chip>
        <v-chip color="amber" variant="tonal" size="small">
          Stack Table : {{ pokerStore.tableStack }} Jetons
        </v-chip>
      </div>
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      closable
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
    </v-alert>

    <!-- Poker Felt Placeholder -->
    <div
      class="rounded-3xl border-4 border-amber-900/60 bg-emerald-950/80 p-10 text-center shadow-inner"
    >
      <p class="text-sm uppercase tracking-widest text-emerald-300/80">Pot Principal</p>
      <p class="text-4xl font-extrabold text-white mt-1">{{ pokerStore.pot }} Jetons</p>

      <div class="mt-8 flex justify-center gap-3">
        <template v-if="!pokerStore.isSeated">
          <div
            class="flex items-center gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800"
          >
            <v-text-field
              v-model.number="buyInInput"
              type="number"
              label="Cave (Buy-in)"
              variant="outlined"
              density="compact"
              hide-details
              style="width: 150px"
            />
            <v-btn
              color="amber-accent-3"
              variant="flat"
              class="text-none font-bold text-slate-950"
              :disabled="walletStore.balance < buyInInput || buyInInput <= 0"
              @click="runAction(() => pokerStore.sitIn(buyInInput))"
            >
              S'asseoir (Sit-in)
            </v-btn>
          </div>
        </template>

        <template v-else>
          <v-btn
            color="error"
            variant="tonal"
            class="text-none"
            @click="runAction(pokerStore.leaveTable)"
          >
            Quitter la table (Cash-out {{ pokerStore.tableStack }} Jetons)
          </v-btn>
        </template>
      </div>
    </div>
  </div>
</template>
