<script setup lang="ts">
import { useWalletStore } from '@/core/stores/useWalletStore';

const walletStore = useWalletStore();

const games = [
  {
    title: "Texas Hold'em Poker",
    subtitle: 'No-Limit 6-Max • Temps réel WebSocket',
    description: 'Affrontez les autres joueurs sur nos tables Cash Game avec gestion de caves et Side Pots.',
    to: '/poker',
    icon: 'mdi-cards-playing-spade',
    owner: 'Dev 1 (Achile)',
    accent: 'emerald',
  },
  {
    title: 'Blackjack Royal',
    subtitle: 'Joueur vs Banque • Tirage CSPRNG',
    description: 'Approchez-vous de 21 sans dépasser face au croupier officiel de la banque.',
    to: '/blackjack',
    icon: 'mdi-cards-playing-club',
    owner: 'Dev 3',
    accent: 'amber',
  },
  {
    title: 'Roulette Européenne',
    subtitle: 'Mises Rapides • Zéro Unique',
    description: 'Placez vos jetons sur le tapis et lancez la roue certifiée par RNG cryptographique.',
    to: '/roulette',
    icon: 'mdi-poker-chip',
    owner: 'Dev 4',
    accent: 'rose',
  },
];
</script>

<template>
  <div class="space-y-8">
    <div class="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span class="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
            Lobby Principal • Play Money
          </span>
          <h1 class="mt-2 text-3xl font-extrabold text-white">Bienvenue sur Royal Casino</h1>
          <p class="mt-1 text-slate-400">
            Architecture modulaire Feature-Based prête pour le développement en parallèle.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <v-btn color="amber-accent-3" variant="tonal" prepend-icon="mdi-plus-circle" @click="walletStore.adjustBalance(500)">
            +500 Jetons (Test Mock)
          </v-btn>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <v-card
        v-for="game in games"
        :key="game.to"
        class="rounded-xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between"
        elevation="0"
      >
        <div>
          <div class="flex items-center justify-between mb-4">
            <v-icon :icon="game.icon" size="36" color="amber-accent-3" />
            <span class="text-xs font-mono text-slate-400 border border-slate-700 rounded px-2 py-0.5">
              {{ game.owner }}
            </span>
          </div>
          <h2 class="text-xl font-bold text-white">{{ game.title }}</h2>
          <p class="text-xs font-medium text-amber-400 mt-0.5">{{ game.subtitle }}</p>
          <p class="text-sm text-slate-400 mt-3">{{ game.description }}</p>
        </div>

        <v-btn :to="game.to" color="amber-accent-3" variant="flat" class="mt-6 text-none font-bold text-slate-950" block>
          Rejoindre la table
        </v-btn>
      </v-card>
    </div>
  </div>
</template>
