<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '../types';

const props = defineProps<{ card: Card | null }>();

const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;
const SUIT_NAMES = { S: 'pique', H: 'cœur', D: 'carreau', C: 'trèfle' } as const;

const symbol = computed(() => (props.card ? SUIT_SYMBOLS[props.card.suit] : ''));
const isRed = computed(() => props.card?.suit === 'H' || props.card?.suit === 'D');
const label = computed(() =>
  props.card ? `${props.card.rank} de ${SUIT_NAMES[props.card.suit]}` : 'Carte face cachée',
);
</script>

<template>
  <div
    class="relative h-24 w-16 shrink-0 rounded-lg shadow-lg sm:h-28 sm:w-20"
    role="img"
    :aria-label="label"
  >
    <div
      v-if="card"
      class="flex h-full w-full flex-col justify-between rounded-lg border border-line-strong bg-card p-1.5 font-semibold"
      :class="isRed ? 'text-suit-red' : 'text-on-card'"
    >
      <span class="text-sm leading-none sm:text-base">{{ card.rank }}{{ symbol }}</span>
      <span class="self-center text-2xl leading-none sm:text-3xl">{{ symbol }}</span>
      <span class="rotate-180 text-sm leading-none sm:text-base">{{ card.rank }}{{ symbol }}</span>
    </div>
    <div v-else class="h-full w-full rounded-lg border-2 border-card bg-card-back p-1.5">
      <div class="h-full w-full rounded border border-card/40 bg-card/10" />
    </div>
  </div>
</template>
