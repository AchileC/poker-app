<script setup lang="ts">
import { computed } from 'vue';
import { chipColorClass } from '../utils';

const props = withDefaults(defineProps<{ value: number; size?: 'sm' | 'md' }>(), { size: 'md' });

const label = computed(() =>
  props.value >= 1000 ? `${Math.round(props.value / 100) / 10}k` : `${props.value}`,
);
</script>

<template>
  <span class="casino-chip text-card" :class="[chipColorClass(value), `is-${size}`]">
    <span class="chip-label">{{ label }}</span>
  </span>
</template>

<style scoped>
.casino-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-weight: 700;
  box-shadow:
    inset 0 0 0 2px rgba(var(--v-theme-card), 0.9),
    0 3px 8px -2px rgba(0, 0, 0, 0.6);
}
/* Liseré pointillé caractéristique des jetons de casino */
.casino-chip::before {
  content: '';
  position: absolute;
  inset: 12%;
  border-radius: 9999px;
  border: 2px dashed rgba(var(--v-theme-card), 0.75);
}
.chip-label {
  position: relative;
  line-height: 1;
}
.is-md {
  width: 3.25rem;
  height: 3.25rem;
  font-size: 0.8rem;
}
.is-sm {
  width: 1.75rem;
  height: 1.75rem;
  font-size: 0.55rem;
}
.is-sm::before {
  border-width: 1px;
}
</style>
