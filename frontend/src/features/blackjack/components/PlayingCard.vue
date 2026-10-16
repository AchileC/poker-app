<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '../types';

const props = defineProps<{ card: Card | null }>();

const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;
const SUIT_NAMES = { S: 'pique', H: 'cœur', D: 'carreau', C: 'trèfle' } as const;

const symbol = computed(() => (props.card ? SUIT_SYMBOLS[props.card.suit] : ''));
const isRed = computed(() => props.card?.suit === 'H' || props.card?.suit === 'D');
const isFaceCard = computed(() => ['J', 'Q', 'K'].includes(props.card?.rank ?? ''));
const label = computed(() =>
  props.card ? `${props.card.rank} de ${SUIT_NAMES[props.card.suit]}` : 'Carte face cachée',
);
</script>

<template>
  <!-- La carte se retourne (rotation 3D) quand `card` passe de null à une valeur -->
  <div class="playing-card" role="img" :aria-label="label">
    <div class="card-inner" :class="{ 'is-face-down': !card }">
      <div class="card-face card-front bg-card" :class="isRed ? 'text-suit-red' : 'text-on-card'">
        <template v-if="card">
          <div class="corner">
            <span>{{ card.rank }}</span>
            <span>{{ symbol }}</span>
          </div>
          <div class="center" :class="{ 'is-face': isFaceCard }">
            {{ isFaceCard ? card.rank : symbol }}
          </div>
          <div class="corner corner-bottom">
            <span>{{ card.rank }}</span>
            <span>{{ symbol }}</span>
          </div>
        </template>
      </div>
      <div class="card-face card-back" />
    </div>
  </div>
</template>

<style scoped>
.playing-card {
  height: var(--card-h, 112px);
  aspect-ratio: 5 / 7;
  perspective: 800px;
  flex-shrink: 0;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
}
.card-inner.is-face-down {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  border-radius: calc(var(--card-h, 112px) * 0.07);
  backface-visibility: hidden;
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.25),
    0 6px 16px -6px rgba(0, 0, 0, 0.6);
}

.card-front {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: calc(var(--card-h, 112px) * 0.05);
  font-weight: 600;
}

.corner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
  font-size: calc(var(--card-h, 112px) * 0.14);
  line-height: 1;
}
.corner span + span {
  font-size: 0.85em;
}
.corner-bottom {
  align-self: flex-end;
  transform: rotate(180deg);
}

.center {
  align-self: center;
  font-size: calc(var(--card-h, 112px) * 0.34);
  line-height: 1;
}
.center.is-face {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: calc(var(--card-h, 112px) * 0.3);
  padding: 0.15em 0.3em;
  border: 1px solid currentColor;
  border-radius: 0.15em;
  opacity: 0.9;
}

.card-back {
  transform: rotateY(180deg);
  border: calc(var(--card-h, 112px) * 0.035) solid rgb(var(--v-theme-card));
  background:
    repeating-linear-gradient(45deg, rgba(var(--v-theme-card), 0.14) 0 2px, transparent 2px 7px),
    repeating-linear-gradient(-45deg, rgba(var(--v-theme-card), 0.14) 0 2px, transparent 2px 7px),
    rgb(var(--v-theme-card-back));
}

@media (prefers-reduced-motion: reduce) {
  .card-inner {
    transition: none;
  }
}
</style>
