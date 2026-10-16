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
];
</script>

<template>
  <v-app theme="dark">
    <v-app-bar flat class="border-b border-slate-800 bg-slate-900/90 backdrop-blur">
      <v-container class="mx-auto flex items-center justify-between px-4 py-0">
        <!-- Brand & Navigation -->
        <div class="flex items-center gap-6">
          <RouterLink
            to="/"
            class="flex items-center gap-2 text-lg font-bold tracking-wide text-amber-400 no-underline"
          >
            <v-icon icon="mdi-poker-chip" color="amber-lighten-1" size="28" />
            <span>ROYAL CASINO</span>
          </RouterLink>

          <nav class="hidden md:flex items-center gap-1">
            <v-btn
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              variant="text"
              class="text-none font-medium"
              :prepend-icon="link.icon"
            >
              {{ link.title }}
            </v-btn>
          </nav>
        </div>

        <!-- Wallet Balance & Auth -->
        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-2 rounded-full border border-amber-500/30 bg-slate-800/90 px-4 py-1.5"
          >
            <v-icon icon="mdi-poker-chip" color="amber-accent-3" size="20" />
            <span class="text-sm font-semibold text-amber-300">
              {{ walletStore.balance.toLocaleString('fr-FR') }} Jetons
            </span>
          </div>

          <v-btn
            to="/login"
            variant="tonal"
            color="amber-accent-3"
            prepend-icon="mdi-account-circle"
            class="text-none"
          >
            {{ authStore.user ? authStore.user.username : 'Connexion' }}
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <v-main class="bg-slate-950 min-h-screen">
      <v-container class="mx-auto py-8 px-4">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
