<script setup lang="ts">
import { useWalletStore } from '@/core/stores/useWalletStore';

const walletStore = useWalletStore();
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-line pb-4">
      <span class="text-xs font-mono text-primary"
        >Périmètre Dev 3 • Blackjack (Joueur vs Banque)</span
      >
      <h1 class="text-2xl font-bold text-on-surface mt-1">Table de Blackjack</h1>
    </div>

    <v-card class="rounded-2xl border border-line bg-surface p-8 text-center" elevation="0">
      <v-icon icon="mdi-cards-playing-club" size="48" color="primary" />
      <p class="mt-3 text-on-surface">
        Espace dédié au développement du module Blackjack (`frontend/src/features/blackjack/`).
      </p>
      <p class="mt-1 text-xs text-subtle">
        Solde disponible via `useWalletStore` : {{ walletStore.balance }} Jetons
      </p>
    </v-card>
  </div>
</template>
