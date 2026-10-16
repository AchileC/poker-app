<script setup lang="ts">
import { useWalletStore } from '@/core/stores/useWalletStore';
import { useAuthStore } from '@/core/stores/useAuthStore';

const walletStore = useWalletStore();
const authStore = useAuthStore();

const navLinks = [
  { title: 'Lobby', to: '/', icon: 'mdi-home-variant' },
  { title: "Poker Hold'em", to: '/poker', icon: 'mdi-cards-playing-spade' },
  { title: 'Blackjack', to: '/blackjack', icon: 'mdi-cards-playing-club' },
  { title: 'Roulette', to: '/roulette', icon: 'mdi-poker-chip' },
  { title: 'Crash', to: '/crash', icon: 'mdi-chart-line-variant' },
];
</script>

<template>
  <v-app>
    <v-app-bar flat class="border-b border-line bg-surface/90 backdrop-blur">
      <v-container class="mx-auto flex items-center justify-between px-4 py-0">
        <!-- Brand & Navigation -->
        <div class="flex items-center gap-6">
          <RouterLink
            to="/"
            class="flex items-center gap-2 text-lg font-bold tracking-wide text-primary no-underline"
          >
            <v-icon icon="mdi-poker-chip" color="primary" size="28" />
            <span>ROYAL CASINO</span>
          </RouterLink>

          <nav class="hidden md:flex items-center gap-1">
            <v-btn
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              variant="text"
              class="normal-case font-medium"
              :prepend-icon="link.icon"
            >
              {{ link.title }}
            </v-btn>
          </nav>
        </div>

        <!-- Wallet Balance & Auth -->
        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-2 rounded-full border border-primary/30 bg-surface-bright/90 px-4 py-1.5"
          >
            <v-icon icon="mdi-poker-chip" color="primary" size="20" />
            <span class="text-sm font-semibold text-primary">
              {{ walletStore.balance.toLocaleString('fr-FR') }} Jetons
            </span>
          </div>

          <v-btn
            to="/login"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-account-circle"
            class="normal-case"
          >
            {{ authStore.user ? authStore.user.username : 'Connexion' }}
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <v-main class="bg-background min-h-screen">
      <v-container class="mx-auto py-8 px-4">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
