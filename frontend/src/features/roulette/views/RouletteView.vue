<script setup lang="ts">
import { useWalletStore } from '@/core/stores/useWalletStore';

const walletStore = useWalletStore();
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-line pb-4">
      <span class="text-xs font-mono text-accent">Périmètre Dev 4 • Roulette Européenne</span>
      <h1 class="text-2xl font-bold text-on-surface mt-1">Table de Roulette</h1>
    </div>

    <v-card class="rounded-2xl border border-line bg-surface p-8 text-center" elevation="0">
      <v-icon icon="mdi-poker-chip" size="48" color="primary" />
      <p class="mt-3 text-on-surface">
        Espace dédié au développement du module Roulette (`frontend/src/features/roulette/`).
      </p>
      <p class="mt-1 text-xs text-subtle">
        Solde disponible via `useWalletStore` : {{ walletStore.balance }} Jetons
      </p>
    </v-card>
  </div>
</template>
