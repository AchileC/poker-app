<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { useWalletStore } from '@/core/stores/useWalletStore';

const authStore = useAuthStore();
const walletStore = useWalletStore();

const username = ref(authStore.user?.username ?? 'PlayerOne');
const password = ref('');
const isLoading = ref(false);

async function handleLogin() {
  isLoading.value = true;
  try {
    await authStore.login(username.value);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <v-card class="rounded-xl border border-slate-800 bg-slate-900 p-6" elevation="0">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <span class="text-xs font-mono text-amber-400"
            >Périmètre Dev 2 • Auth, Profil & Wallet</span
          >
          <h1 class="text-2xl font-bold text-white mt-1">Connexion & Portefeuille</h1>
        </div>
        <v-icon icon="mdi-shield-key-outline" size="32" color="amber-accent-3" />
      </div>

      <v-form @submit.prevent="handleLogin">
        <v-text-field
          v-model="username"
          label="Pseudo"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-account"
          class="mb-3"
        />
        <v-text-field
          v-model="password"
          label="Mot de passe"
          type="password"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-lock"
          class="mb-4"
        />

        <v-btn
          type="submit"
          :loading="isLoading"
          color="amber-accent-3"
          variant="flat"
          block
          class="text-none font-bold text-slate-950"
        >
          Se connecter (Mock Actif)
        </v-btn>
      </v-form>

      <v-divider class="my-6" />

      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-400">Solde Wallet :</span>
        <span class="font-bold text-amber-300">{{ walletStore.balance }} Jetons</span>
      </div>
    </v-card>
  </div>
</template>
