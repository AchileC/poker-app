<script setup lang="ts">
import { httpClient } from '@/core/api/httpClient';
import { useWalletStore } from '@/core/stores/useWalletStore';

const walletStore = useWalletStore();

// Rechargement gratuit bouchonné (Jour 1), remplacé par la boutique du Dev 2
async function mockTopUp() {
  const { data } = await httpClient.post<{ newBalance: number }>('/wallet/mock-top-up');
  walletStore.setBalance(data.newBalance);
}

const games = [
  {
    title: "Texas Hold'em Poker",
    subtitle: 'No-Limit 6-Max • Temps réel WebSocket',
    description:
      'Affrontez les autres joueurs sur nos tables Cash Game avec gestion de caves et Side Pots.',
    to: '/poker',
    icon: 'mdi-cards-playing-spade',
    owner: 'Dev 1 (Achile)',
    accent: 'secondary',
  },
  {
    title: 'Blackjack Royal',
    subtitle: 'Joueur vs Banque • Tirage CSPRNG',
    description: 'Approchez-vous de 21 sans dépasser face au croupier officiel de la banque.',
    to: '/blackjack',
    icon: 'mdi-cards-playing-club',
    owner: 'Dev 3',
    accent: 'primary',
  },
  {
    title: 'Roulette Européenne',
    subtitle: 'Mises Rapides • Zéro Unique',
    description:
      'Placez vos jetons sur le tapis et lancez la roue certifiée par RNG cryptographique.',
    to: '/roulette',
    icon: 'mdi-poker-chip',
    owner: 'Dev 4',
    accent: 'accent',
  },
];
</script>

<template>
  <div class="space-y-8">
    <div class="rounded-2xl border border-line bg-gradient-to-br from-surface to-background p-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span
            class="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary"
          >
            Lobby Principal • Play Money
          </span>
          <h1 class="mt-2 text-3xl font-extrabold text-on-surface">Bienvenue sur Royal Casino</h1>
          <p class="mt-1 text-muted">
            Architecture modulaire Feature-Based prête pour le développement en parallèle.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus-circle"
            class="normal-case"
            @click="mockTopUp"
          >
            +500 Jetons (Test Mock)
          </v-btn>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <v-card
        v-for="game in games"
        :key="game.to"
        class="rounded-xl border border-line bg-surface/80 p-6 flex flex-col justify-between"
        elevation="0"
      >
        <div>
          <div class="flex items-center justify-between mb-4">
            <v-icon :icon="game.icon" size="36" color="primary" />
            <span
              class="text-xs font-mono text-muted border border-line-strong rounded px-2 py-0.5"
            >
              {{ game.owner }}
            </span>
          </div>
          <h2 class="text-xl font-bold text-on-surface">{{ game.title }}</h2>
          <p class="text-xs font-medium text-primary mt-0.5">{{ game.subtitle }}</p>
          <p class="text-sm text-muted mt-3">{{ game.description }}</p>
        </div>

        <v-btn
          :to="game.to"
          color="primary"
          variant="flat"
          class="mt-6 normal-case font-bold"
          block
        >
          Rejoindre la table
        </v-btn>
      </v-card>
    </div>
  </div>
</template>
