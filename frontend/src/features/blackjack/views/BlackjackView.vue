<script setup lang="ts">
import { useWalletStore } from '@/core/stores/useWalletStore';

const walletStore = useWalletStore();
</script>

<template>
  <div class="space-y-6">
    <div class="border-b border-slate-800 pb-4">
      <span class="text-xs font-mono text-amber-400">Périmètre Dev 3 • Blackjack (Joueur vs Banque)</span>
      <h1 class="text-2xl font-bold text-white mt-1">Table de Blackjack</h1>
    </div>

    <v-card class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center" elevation="0">
      <v-icon icon="mdi-cards-playing-club" size="48" color="amber-accent-3" />
      <p class="mt-3 text-slate-300">
        Espace dédié au développement du module Blackjack (`frontend/src/features/blackjack/`).
      </p>
      <p class="mt-1 text-xs text-slate-500">
        Solde disponible via `useWalletStore` : {{ walletStore.balance }} Jetons
      </p>
    </v-card>
  </div>
</template>
