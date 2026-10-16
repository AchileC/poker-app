<script setup lang="ts">
import { computed } from 'vue';
import type { Card, HandResult } from '../types';
import { handValue } from '../utils';
import CasinoChip from './CasinoChip.vue';
import PlayingCard from './PlayingCard.vue';

const props = defineProps<{
  cards: (Card | null)[];
  label: string;
  bet?: number;
  result?: HandResult | null;
  active?: boolean;
  /** Point d'où arrivent les cartes (le sabot), relatif à la main. */
  dealFrom?: { x: string; y: string };
}>();

const RESULT_LABELS: Record<HandResult, string> = {
  WIN: 'Gagné',
  BLACKJACK: 'Blackjack',
  PUSH: 'Égalité',
  LOSE: 'Perdu',
  SURRENDER: 'Abandon',
  EVEN_MONEY: 'Even money',
};

const RESULT_CLASSES: Record<HandResult, string> = {
  WIN: 'bg-success text-on-primary',
  BLACKJACK: 'bg-primary text-on-primary',
  PUSH: 'bg-info text-on-primary',
  LOSE: 'bg-error text-on-primary',
  SURRENDER: 'bg-warning text-on-primary',
  EVEN_MONEY: 'bg-success text-on-primary',
};

const value = computed(() => handValue(props.cards));
const displayValue = computed(() => {
  const { total, soft } = value.value;
  if (total === 0) return '';
  if (total > 21) return `${total} · Sauté`;
  // Main soft : les deux totaux tant que la main reste jouable (ex : 7 / 17)
  return soft && total < 21 ? `${total - 10} / ${total}` : `${total}`;
});

const dealStyle = computed(() => ({
  '--deal-x': props.dealFrom?.x ?? '40vw',
  '--deal-y': props.dealFrom?.y ?? '-30vh',
}));
</script>

<template>
  <div class="flex flex-col items-center gap-1.5" :style="dealStyle">
    <div class="flex h-6 items-center gap-1.5 text-xs">
      <span class="text-on-surface/70 uppercase tracking-wider">{{ label }}</span>
      <span
        v-if="displayValue"
        :key="displayValue"
        class="animate-fade rounded-full bg-background/60 px-2 py-0.5 font-mono font-semibold text-on-surface tabular-nums"
      >
        {{ displayValue }}
      </span>
    </div>

    <div
      class="relative rounded-xl p-1.5 transition-shadow duration-300"
      :class="active ? 'is-active' : ''"
    >
      <TransitionGroup
        name="deal"
        tag="div"
        class="cards flex"
        :style="{ minHeight: 'var(--card-h)' }"
      >
        <PlayingCard v-for="(card, index) in cards" :key="index" :card="card" />
      </TransitionGroup>

      <span
        v-if="result"
        class="animate-pop absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide whitespace-nowrap shadow-md"
        :class="RESULT_CLASSES[result]"
      >
        {{ RESULT_LABELS[result] }}
      </span>
    </div>

    <div v-if="bet" class="flex h-7 items-center gap-1.5">
      <CasinoChip :value="bet" size="sm" />
      <span class="text-xs font-medium text-on-surface/80 tabular-nums">{{ bet }}</span>
    </div>
  </div>
</template>

<style scoped>
.cards > * + * {
  margin-left: calc(var(--card-h, 112px) * -0.5);
}

.is-active {
  box-shadow:
    0 0 0 2px rgba(var(--v-theme-primary), 0.9),
    0 0 24px -4px rgba(var(--v-theme-primary), 0.55);
}

/* Distribution : la carte glisse depuis le sabot avec une légère rotation */
.deal-enter-active {
  transition:
    transform 460ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 200ms ease-out;
}
.deal-enter-from {
  opacity: 0;
  transform: translate(var(--deal-x), var(--deal-y)) rotate(-18deg) scale(0.9);
}

.animate-fade {
  animation: fade-in 180ms ease-out;
}
.animate-pop {
  animation: pop-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .deal-enter-active {
    transition: opacity 150ms ease-out;
  }
  .deal-enter-from {
    transform: none;
  }
  .animate-pop {
    animation: fade-in 150ms ease-out;
  }
}
</style>
