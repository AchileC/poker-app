<script setup lang="ts">
import { computed } from 'vue';
import type { Card, HandResult } from '../types';
import PlayingCard from './PlayingCard.vue';

const props = defineProps<{
  cards: (Card | null)[];
  value: number;
  soft?: boolean;
  label: string;
  bet?: number;
  result?: HandResult | null;
  active?: boolean;
}>();

const RESULT_LABELS: Record<HandResult, string> = {
  WIN: 'Gagné',
  BLACKJACK: 'Blackjack !',
  PUSH: 'Égalité',
  LOSE: 'Perdu',
  SURRENDER: 'Abandon',
  EVEN_MONEY: 'Even money',
};

const RESULT_COLORS: Record<HandResult, string> = {
  WIN: 'success',
  BLACKJACK: 'primary',
  PUSH: 'info',
  LOSE: 'error',
  SURRENDER: 'warning',
  EVEN_MONEY: 'success',
};

const displayValue = computed(() => {
  if (props.value === 0) return '';
  // Main soft : afficher les deux totaux tant qu'ils ont un sens (ex : 7 / 17)
  return props.soft && props.value < 21 ? `${props.value - 10} / ${props.value}` : `${props.value}`;
});
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 rounded-xl p-3 transition-shadow"
    :class="active ? 'ring-2 ring-primary' : ''"
  >
    <div class="flex items-center gap-2 text-sm">
      <span class="font-medium text-on-surface">{{ label }}</span>
      <span
        v-if="displayValue"
        class="rounded-full bg-background/70 px-2 py-0.5 font-mono font-semibold text-primary"
      >
        {{ displayValue }}
      </span>
    </div>

    <TransitionGroup name="deal" tag="div" class="flex min-h-24 -space-x-8 sm:min-h-28">
      <PlayingCard v-for="(card, index) in cards" :key="index" :card="card" />
    </TransitionGroup>

    <div class="flex min-h-7 items-center gap-2">
      <span v-if="bet" class="text-xs text-muted">Mise : {{ bet }}</span>
      <v-chip v-if="result" :color="RESULT_COLORS[result]" size="small" variant="flat">
        {{ RESULT_LABELS[result] }}
      </v-chip>
    </div>
  </div>
</template>

<style scoped>
.deal-enter-active {
  transition:
    transform 0.35s ease-out,
    opacity 0.35s ease-out;
}
.deal-enter-from {
  opacity: 0;
  transform: translateY(-40px) rotate(-8deg);
}
</style>
