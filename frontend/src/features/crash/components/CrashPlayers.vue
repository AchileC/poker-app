<script setup lang="ts">
import { computed } from 'vue';
import type { CrashPhase, PublicPlayer } from '../types';
import { formatMultiplier } from '../utils';

const props = defineProps<{ players: PublicPlayer[]; phase: CrashPhase | null; total: number }>();

const sorted = computed(() => [...props.players].sort((a, b) => b.amount - a.amount));
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex shrink-0 items-baseline justify-between px-3 pt-3 pb-2">
      <p class="text-sm font-semibold text-on-surface">
        Joueurs <span class="text-muted tabular-nums">{{ players.length }}</span>
      </p>
      <p class="text-xs text-muted tabular-nums">{{ total.toLocaleString('fr-FR') }} misés</p>
    </div>

    <ul class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
      <li
        v-for="player in sorted"
        :key="player.key"
        class="player-row flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
        :class="player.cashedOutAt !== null ? 'bg-success/10' : ''"
      >
        <span class="truncate text-on-surface/90">{{ player.username }}</span>
        <span class="flex shrink-0 items-center gap-2 tabular-nums">
          <span class="text-muted">{{ player.amount }}</span>
          <span
            v-if="player.cashedOutAt !== null"
            class="w-24 text-right font-semibold text-success"
          >
            {{ formatMultiplier(player.cashedOutAt) }} · +{{ player.payout - player.amount }}
          </span>
          <span
            v-else
            class="w-24 text-right"
            :class="phase === 'CRASHED' ? 'text-error line-through opacity-70' : 'text-subtle'"
          >
            {{ phase === 'CRASHED' ? `−${player.amount}` : '—' }}
          </span>
        </span>
      </li>
      <li v-if="!players.length" class="px-2 py-6 text-center text-xs text-muted">
        Aucune mise pour l'instant
      </li>
    </ul>
  </div>
</template>

<style scoped>
.player-row {
  animation: row-in 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes row-in {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .player-row {
    animation: none;
  }
}
</style>
