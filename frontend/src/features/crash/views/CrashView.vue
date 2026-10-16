<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useWalletStore } from '@/core/stores/useWalletStore';
import CrashChart from '../components/CrashChart.vue';
import CrashPlayers from '../components/CrashPlayers.vue';
import { useCrashClock } from '../composables/useCrashClock';
import { useCrashStore } from '../stores/useCrashStore';
import type { CrashHistoryEntry } from '../types';
import { crashColorClass, formatMultiplier, payoutFor, verifyRound } from '../utils';

const store = useCrashStore();
const walletStore = useWalletStore();
const { multiplier, countdownMs } = useCrashClock();

const showPlayers = ref(false);
const verifying = ref<CrashHistoryEntry | null>(null);
const verification = ref<{ hashMatches: boolean; crashPoint: number } | null>(null);

const hasActiveBet = computed(
  () => store.myBet !== null && store.myBet.cashedOutAt === null && store.phase !== 'CRASHED',
);
const potentialWin = computed(() =>
  store.myBet ? payoutFor(store.myBet.amount, multiplier.value) : 0,
);
const myCashOut = computed(() =>
  store.myBet?.cashedOutAt != null
    ? {
        cashedOutAt: store.myBet.cashedOutAt,
        payout: store.myBet.payout,
        amount: store.myBet.amount,
      }
    : null,
);
/** Palier du multiplicateur : couleur + petit « pop » à chaque palier franchi. */
const tier = computed(() => {
  const m = multiplier.value;
  if (m >= 1000) return { key: 3, class: 'text-primary glow-primary' };
  if (m >= 500) return { key: 2, class: 'text-success glow-success' };
  if (m >= 200) return { key: 1, class: 'text-success glow-success' };
  return { key: 0, class: 'text-on-surface' };
});
const lostBet = computed(
  () => store.phase === 'CRASHED' && store.myBet !== null && store.myBet.cashedOutAt === null,
);

/** Le bouton principal change selon la phase : miser, encaisser, ou programmer la prochaine mise. */
const mainAction = computed(() => {
  const bet = store.myBet;
  if (!store.connected) return { label: 'Connexion…', color: undefined, disabled: true, run: null };
  if (store.phase === 'RUNNING' && bet && bet.cashedOutAt === null) {
    return {
      label: `Encaisser ${potentialWin.value.toLocaleString('fr-FR')}`,
      color: 'success',
      disabled: store.isSubmitting,
      run: store.cashOut,
    };
  }
  if (store.phase === 'BETTING' && bet) {
    return { label: 'Mise placée', color: undefined, disabled: true, run: null };
  }
  if (store.phase === 'BETTING') {
    return {
      label: `Miser ${store.amount.toLocaleString('fr-FR')}`,
      color: 'primary',
      disabled: store.isSubmitting || !betIsValid.value,
      run: store.placeBet,
    };
  }
  if (store.queued) {
    return {
      label: 'Annuler la prochaine mise',
      color: undefined,
      disabled: false,
      run: store.cancelQueuedBet,
    };
  }
  return {
    label: 'Miser sur la prochaine',
    color: 'primary',
    disabled: !betIsValid.value,
    run: store.placeBet,
  };
});

const betIsValid = computed(
  () =>
    Number.isInteger(store.amount) &&
    store.amount >= store.limits.minBet &&
    store.amount <= store.limits.maxBet &&
    store.amount <= walletStore.balance &&
    (!store.autoEnabled || store.autoTarget >= store.limits.minAutoCashOut / 100),
);

const statusLine = computed(() => {
  const bet = store.myBet;
  if (bet?.cashedOutAt != null) {
    return {
      text: `Encaissé à ${formatMultiplier(bet.cashedOutAt)} · +${bet.payout - bet.amount}`,
      tone: 'text-success',
    };
  }
  if (lostBet.value) return { text: `Perdu · −${store.myBet!.amount}`, tone: 'text-error' };
  if (store.phase === 'BETTING' && bet) {
    return {
      text: bet.autoCashOut
        ? `Encaissement auto à ${formatMultiplier(bet.autoCashOut)}`
        : 'En attente du départ',
      tone: 'text-muted',
    };
  }
  if (store.queued) return { text: 'Mise programmée pour la prochaine partie', tone: 'text-muted' };
  return null;
});

function setAmount(value: number) {
  store.amount = Math.min(store.limits.maxBet, Math.max(store.limits.minBet, Math.floor(value)));
}

async function openVerification(entry: CrashHistoryEntry) {
  verifying.value = entry;
  verification.value = null;
  verification.value = await verifyRound(entry);
}

function onKeydown(event: KeyboardEvent) {
  if (event.code !== 'Space' || event.repeat) return;
  const target = event.target as HTMLElement | null;
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
  event.preventDefault();
  const action = mainAction.value;
  if (action.run && !action.disabled) void action.run();
}

onMounted(() => {
  void store.connect();
  window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  store.disconnect();
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <!-- Hauteur = écran moins la barre de navigation et les marges du layout : rien à faire défiler -->
  <div class="crash-screen flex flex-col gap-3">
    <header class="flex shrink-0 items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="hidden font-mono text-[0.7rem] text-primary sm:block">Périmètre Dev 3 • Crash</p>
        <h1 class="truncate text-lg font-semibold text-on-surface sm:text-xl">
          Crash
          <span v-if="store.roundNumber" class="ml-1 text-sm font-normal text-muted tabular-nums">
            #{{ store.roundNumber }}
          </span>
        </h1>
      </div>

      <div class="flex items-center gap-1">
        <v-btn
          class="normal-case lg:hidden"
          variant="tonal"
          size="small"
          rounded="pill"
          prepend-icon="mdi-account-group"
          @click="showPlayers = true"
        >
          {{ store.players.length }}
        </v-btn>

        <v-menu location="bottom end" :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              icon="mdi-information-outline"
              variant="text"
              size="small"
              aria-label="Règles du Crash"
            />
          </template>
          <v-card class="max-w-sm border border-line" color="surface">
            <v-card-title class="text-base">Règles du Crash</v-card-title>
            <v-card-text class="space-y-3 text-sm text-muted">
              <ul class="space-y-1.5">
                <li>
                  • Misez pendant le compte à rebours ({{ store.limits.minBet }} à
                  {{ store.limits.maxBet }}).
                </li>
                <li>• Le multiplicateur monte jusqu'à crasher à un moment aléatoire.</li>
                <li>• Encaissez avant le crash pour gagner mise × multiplicateur.</li>
                <li>
                  • L'encaissement automatique est exécuté par le serveur, même si vous êtes
                  déconnecté.
                </li>
                <li>• Avantage de la maison : 1 %. Multiplicateur maximum : 1 000×.</li>
              </ul>
              <p>
                <span class="font-semibold text-on-surface">Provably fair.</span> Avant chaque
                partie, le hash SHA-256 d'une graine secrète est publié. Après le crash, la graine
                est révélée : cliquez sur un résultat de l'historique pour vérifier qu'il était fixé
                d'avance.
              </p>
              <p class="text-xs text-subtle">
                Des joueurs de la maison participent aux parties pour les animer ; ils n'influencent
                pas le résultat.
              </p>
              <p class="hidden text-xs text-subtle sm:block">
                Clavier : Espace pour miser ou encaisser.
              </p>
            </v-card-text>
          </v-card>
        </v-menu>
      </div>
    </header>

    <!-- Historique des derniers crashs -->
    <div class="history flex shrink-0 gap-1.5 overflow-hidden" aria-label="Derniers résultats">
      <button
        v-for="entry in store.history"
        :key="entry.number"
        type="button"
        class="history-chip shrink-0 rounded-full bg-surface px-2.5 py-1 font-mono text-xs font-semibold tabular-nums transition-colors hover:bg-surface-bright"
        :class="crashColorClass(entry.crashPoint)"
        :title="`Partie #${entry.number} — vérifier`"
        @click="openVerification(entry)"
      >
        {{ formatMultiplier(entry.crashPoint) }}
      </button>
    </div>

    <!-- Courbe + joueurs -->
    <div class="flex min-h-0 flex-1 gap-3">
      <section
        class="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-line bg-background"
      >
        <CrashChart :phase="store.phase" :players="store.players" :my-cash-out="myCashOut" />

        <div
          class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <template v-if="store.phase === 'BETTING'">
            <p class="text-xs font-semibold tracking-[0.25em] text-muted uppercase">Départ dans</p>
            <p class="text-5xl font-bold text-on-surface tabular-nums sm:text-6xl">
              {{ (countdownMs / 1000).toFixed(1) }}s
            </p>
            <div class="mt-4 h-1 w-40 overflow-hidden rounded-full bg-surface-bright">
              <div
                class="h-full rounded-full bg-primary"
                :style="{ width: `${Math.min(100, (countdownMs / 8000) * 100)}%` }"
              />
            </div>
          </template>
          <template v-else-if="store.phase === 'RUNNING'">
            <p
              :key="tier.key"
              class="multiplier text-6xl font-black tabular-nums sm:text-8xl"
              :class="tier.class"
            >
              {{ formatMultiplier(multiplier) }}
            </p>
            <p v-if="hasActiveBet" class="mt-2 text-sm text-success tabular-nums">
              +{{ (potentialWin - (store.myBet?.amount ?? 0)).toLocaleString('fr-FR') }}
            </p>
          </template>
          <template v-else-if="store.phase === 'CRASHED' && store.crashPoint !== null">
            <div :key="store.roundNumber" class="crashed">
              <p class="text-xs font-semibold tracking-[0.25em] text-error uppercase">Crash !</p>
              <p class="glow-error text-6xl font-black text-error tabular-nums sm:text-8xl">
                {{ formatMultiplier(store.crashPoint) }}
              </p>
            </div>
          </template>
          <p v-else class="text-sm text-muted">Connexion à la table…</p>
        </div>
      </section>

      <aside
        class="hidden w-72 shrink-0 overflow-hidden rounded-3xl border border-line bg-surface/60 lg:block"
      >
        <CrashPlayers :players="store.players" :phase="store.phase" :total="store.totalBets" />
      </aside>
    </div>

    <!-- Mise -->
    <footer class="shrink-0 rounded-2xl border border-line bg-surface/80 p-3">
      <v-alert
        v-if="store.error"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="mb-2"
        @click:close="store.error = null"
      >
        {{ store.error }}
      </v-alert>

      <div class="flex flex-col gap-3 md:flex-row md:items-center">
        <div class="flex flex-1 flex-wrap items-center gap-2">
          <div class="flex items-center gap-1">
            <v-text-field
              :model-value="store.amount"
              type="number"
              label="Mise"
              density="compact"
              variant="outlined"
              hide-details
              class="w-28"
              :min="store.limits.minBet"
              :max="store.limits.maxBet"
              :disabled="hasActiveBet"
              @update:model-value="setAmount(Number($event))"
            />
            <v-btn
              size="small"
              variant="tonal"
              class="normal-case"
              :disabled="hasActiveBet"
              @click="setAmount(store.amount / 2)"
            >
              ½
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              class="normal-case"
              :disabled="hasActiveBet"
              @click="setAmount(store.amount * 2)"
            >
              ×2
            </v-btn>
          </div>

          <div class="flex items-center gap-1">
            <v-switch
              v-model="store.autoEnabled"
              color="primary"
              density="compact"
              hide-details
              inset
              :disabled="hasActiveBet"
              aria-label="Encaissement automatique"
            />
            <v-text-field
              v-model.number="store.autoTarget"
              type="number"
              label="Auto à"
              suffix="×"
              step="0.1"
              density="compact"
              variant="outlined"
              hide-details
              class="w-28"
              :min="1.01"
              :disabled="!store.autoEnabled || hasActiveBet"
            />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <p
            v-if="statusLine"
            class="flex-1 text-right text-sm md:flex-none"
            :class="statusLine.tone"
          >
            {{ statusLine.text }}
          </p>
          <v-btn
            :color="mainAction.color"
            :variant="mainAction.color ? 'flat' : 'tonal'"
            size="x-large"
            rounded="pill"
            class="main-action normal-case font-semibold tabular-nums"
            :class="{ 'flex-1 md:flex-none': !statusLine }"
            :loading="store.isSubmitting"
            :disabled="mainAction.disabled"
            @click="mainAction.run?.()"
          >
            {{ mainAction.label }}
            <kbd class="kbd ml-2 hidden sm:inline-flex">Espace</kbd>
          </v-btn>
        </div>
      </div>
    </footer>

    <!-- Joueurs (mobile) -->
    <v-bottom-sheet v-model="showPlayers">
      <v-card color="surface" class="h-[60dvh]">
        <CrashPlayers :players="store.players" :phase="store.phase" :total="store.totalBets" />
      </v-card>
    </v-bottom-sheet>

    <!-- Vérification provably fair -->
    <v-dialog
      :model-value="verifying !== null"
      max-width="520"
      @update:model-value="verifying = null"
    >
      <v-card v-if="verifying" color="surface" class="border border-line">
        <v-card-title class="text-base">Partie #{{ verifying.number }} — vérification</v-card-title>
        <v-card-text class="space-y-3 text-sm">
          <div>
            <p class="text-xs text-muted">Hash publié avant la partie (SHA-256 de la graine)</p>
            <p class="font-mono text-xs break-all text-on-surface">{{ verifying.seedHash }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Graine révélée après le crash</p>
            <p class="font-mono text-xs break-all text-on-surface">{{ verifying.seed }}</p>
          </div>
          <div v-if="verification" class="space-y-1 rounded-xl bg-background/60 p-3">
            <p :class="verification.hashMatches ? 'text-success' : 'text-error'">
              {{ verification.hashMatches ? '✓' : '✗' }} SHA-256(graine) correspond au hash publié
            </p>
            <p
              :class="
                verification.crashPoint === verifying.crashPoint ? 'text-success' : 'text-error'
              "
            >
              {{ verification.crashPoint === verifying.crashPoint ? '✓' : '✗' }}
              Crash recalculé : {{ formatMultiplier(verification.crashPoint) }} (annoncé
              {{ formatMultiplier(verifying.crashPoint) }})
            </p>
          </div>
          <p class="text-xs text-subtle">
            Calcul fait dans votre navigateur : HMAC-SHA256(graine, numéro de partie), puis crash =
            0,99 / (1 − r), avec r tiré des 52 premiers bits du résultat.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn class="normal-case" @click="verifying = null">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* 8rem = barre de navigation (4rem) + marges verticales du layout (2 × 2rem) */
.crash-screen {
  height: calc(100dvh - 8rem);
  min-height: 32rem;
}

.history {
  mask-image: linear-gradient(to right, black 85%, transparent);
}
.history-chip {
  animation: chip-in 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.crashed {
  animation: crash-shake 420ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
.multiplier {
  animation: tier-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.glow-primary {
  text-shadow: 0 0 32px rgba(var(--v-theme-primary), 0.7);
}
.glow-success {
  text-shadow: 0 0 28px rgba(var(--v-theme-success), 0.6);
}
.glow-error {
  text-shadow: 0 0 32px rgba(var(--v-theme-error), 0.7);
}
@keyframes tier-pop {
  from {
    transform: scale(1.25);
  }
}

.main-action {
  min-width: 13rem;
}

.kbd {
  align-items: center;
  justify-content: center;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 0.3rem;
  border: 1px solid currentColor;
  font-family: ui-monospace, monospace;
  font-size: 0.6rem;
  opacity: 0.55;
}

@keyframes chip-in {
  from {
    opacity: 0;
    transform: translateX(-12px) scale(0.9);
  }
}
@keyframes crash-shake {
  0% {
    transform: scale(1.15);
  }
  20% {
    transform: translateX(-8px) scale(1);
  }
  40% {
    transform: translateX(7px);
  }
  60% {
    transform: translateX(-5px);
  }
  80% {
    transform: translateX(3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .history-chip,
  .crashed,
  .multiplier {
    animation: none;
  }
}
</style>
