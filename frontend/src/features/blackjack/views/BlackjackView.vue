<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useWalletStore } from '@/core/stores/useWalletStore';
import BlackjackHand from '../components/BlackjackHand.vue';
import CasinoChip from '../components/CasinoChip.vue';
import { useDealAnimation } from '../composables/useDealAnimation';
import { CHIP_VALUES, useBlackjackStore } from '../stores/useBlackjackStore';
import type { BlackjackAction, HandResult, TableRules } from '../types';

const store = useBlackjackStore();
const walletStore = useWalletStore();
const { round } = storeToRefs(store);

const { dealerCards, hands, isAnimating } = useDealAnimation(round, () => store.isRestoring);

const ACTIONS: Record<BlackjackAction, { label: string; key: string }> = {
  HIT: { label: 'Tirer', key: 'H' },
  STAND: { label: 'Rester', key: 'S' },
  DOUBLE: { label: 'Doubler', key: 'D' },
  SPLIT: { label: 'Séparer', key: 'P' },
  SURRENDER: { label: 'Abandonner', key: 'R' },
  INSURANCE: { label: 'Assurance', key: 'A' },
  EVEN_MONEY: { label: 'Even money', key: 'E' },
  NO_INSURANCE: { label: 'Non merci', key: 'N' },
};
const PRIMARY_ACTIONS: BlackjackAction[] = ['HIT', 'STAND', 'INSURANCE', 'EVEN_MONEY'];

const OUTCOME_LABELS: Record<HandResult, string> = {
  WIN: 'Gagné',
  BLACKJACK: 'Blackjack !',
  PUSH: 'Égalité',
  LOSE: 'Perdu',
  SURRENDER: 'Abandon',
  EVEN_MONEY: 'Even money',
};

const canAct = computed(() => !store.isBusy && !isAnimating.value);
const isPlaying = computed(() => store.isPlaying || isAnimating.value);
const isSettledVisible = computed(() => round.value?.phase === 'SETTLED' && !isAnimating.value);

const message = computed(() => {
  const current = round.value;
  if (!current || isAnimating.value) return null;
  if (current.phase === 'INSURANCE') {
    return current.availableActions.includes('EVEN_MONEY')
      ? 'Blackjack face à un As — prendre even money (payé 1:1) ?'
      : `Le croupier montre un As — assurance pour ${insuranceCost.value} ?`;
  }
  if (current.phase === 'PLAYER_TURN' && current.hands.length > 1) {
    return `Main ${current.activeHandIndex + 1} sur ${current.hands.length}`;
  }
  return null;
});

const outcome = computed(() => {
  const current = round.value;
  if (!current || !isSettledVisible.value || current.totalPayout === null) return null;
  const net = current.totalPayout - current.totalBet;
  const results = current.hands.map((hand) => hand.result).filter(Boolean) as HandResult[];
  const title =
    results.length === 1
      ? OUTCOME_LABELS[results[0]!]
      : net > 0
        ? 'Gagné'
        : net < 0
          ? 'Perdu'
          : 'Égalité';
  return { net, title };
});

const insuranceCost = computed(() => Math.floor((round.value?.hands[0]?.bet ?? 0) / 2));

function actionCost(action: BlackjackAction): number {
  const current = round.value;
  if (!current) return 0;
  if (action === 'DOUBLE' || action === 'SPLIT') return current.hands[current.activeHandIndex]!.bet;
  if (action === 'INSURANCE') return insuranceCost.value;
  return 0;
}

const canDeal = computed(() => {
  const rules = store.rules;
  return (
    !!rules &&
    !isPlaying.value &&
    !store.isBusy &&
    store.bet >= rules.minBet &&
    store.bet <= rules.maxBet &&
    store.bet <= walletStore.balance
  );
});

const betHint = computed(() => {
  const rules = store.rules;
  if (!rules) return '';
  if (store.bet > walletStore.balance) return 'Solde insuffisant';
  if (store.bet < rules.minBet) return `Min ${rules.minBet} · Max ${rules.maxBet}`;
  return `Max ${rules.maxBet}`;
});

function rulesSummary(rules: TableRules): string[] {
  return [
    `Mises de ${rules.minBet} à ${rules.maxBet}`,
    `${rules.decks} paquets, remélangés à chaque partie`,
    `Blackjack payé ${rules.blackjackPayout[0]}:${rules.blackjackPayout[1]}, assurance 2:1`,
    'Le croupier reste sur 17 (soft 17 compris)',
    rules.dealerPeeks
      ? 'Carte cachée : le croupier vérifie son blackjack avant votre tour'
      : 'Sans carte cachée : contre un blackjack, doubles et splits sont perdus',
    rules.doubleOn === 'ANY' ? 'Double sur 2 cartes quelconques' : 'Double sur 9, 10 ou 11',
    `Split jusqu'à ${rules.maxHands} mains, As : une carte chacun`,
    rules.lateSurrender ? 'Abandon : récupère la moitié de la mise' : 'Abandon non autorisé',
  ];
}

function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
  const key = event.key.toUpperCase();

  if (round.value && store.isPlaying) {
    if (!canAct.value) return;
    const action = round.value.availableActions.find((a) => ACTIONS[a].key === key);
    if (action && actionCost(action) <= walletStore.balance) {
      event.preventDefault();
      void store.act(action);
    }
  } else if ((key === 'ENTER' || key === ' ') && canDeal.value) {
    event.preventDefault();
    void store.deal();
  }
}

onMounted(() => {
  void store.init();
  window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <!-- Hauteur = écran moins la barre de navigation et les marges du layout : tout reste visible sans scroll -->
  <div class="bj-screen flex flex-col gap-3">
    <!-- En-tête compact -->
    <header class="flex shrink-0 items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="hidden font-mono text-[0.7rem] text-primary sm:block">
          Périmètre Dev 3 • Blackjack
        </p>
        <h1 class="truncate text-lg font-semibold text-on-surface sm:text-xl">Blackjack</h1>
      </div>

      <div class="flex items-center gap-1">
        <v-btn-toggle
          v-model="store.selectedTable"
          mandatory
          color="primary"
          variant="outlined"
          density="compact"
          rounded="pill"
          :disabled="isPlaying || store.isBusy"
        >
          <v-btn
            v-for="table in store.tables"
            :key="table.table"
            :value="table.table"
            class="normal-case"
            size="small"
          >
            {{ table.name }}
          </v-btn>
        </v-btn-toggle>

        <v-menu location="bottom end" :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              icon="mdi-information-outline"
              variant="text"
              size="small"
              aria-label="Règles de la table"
            />
          </template>
          <v-card v-if="store.rules" class="max-w-xs border border-line" color="surface">
            <v-card-title class="text-base">Table {{ store.rules.name }}</v-card-title>
            <v-card-text>
              <ul class="space-y-1.5 text-sm text-muted">
                <li v-for="rule in rulesSummary(store.rules)" :key="rule" class="flex gap-2">
                  <span class="text-primary">•</span>{{ rule }}
                </li>
              </ul>
              <p class="mt-3 hidden text-xs text-subtle sm:block">
                Clavier : H tirer · S rester · D doubler · P séparer · R abandon · Entrée distribuer
              </p>
            </v-card-text>
          </v-card>
        </v-menu>
      </div>
    </header>

    <!-- Tapis -->
    <section
      class="felt relative flex min-h-0 flex-1 flex-col items-center justify-between overflow-hidden rounded-[2rem] px-3 py-3 sm:rounded-[3rem] sm:px-6 sm:py-5"
      :class="{ 'is-compact': hands.length > 2 }"
    >
      <!-- Sabot -->
      <div class="shoe absolute top-4 right-4 sm:top-6 sm:right-8" aria-hidden="true">
        <span class="shoe-card" /><span class="shoe-card" /><span class="shoe-card" />
      </div>

      <!-- Croupier -->
      <div class="flex min-h-[calc(var(--card-h)+3.5rem)] items-start justify-center">
        <BlackjackHand
          v-if="round"
          label="Croupier"
          :cards="dealerCards"
          :deal-from="{ x: '30vw', y: '-4vh' }"
        />
      </div>

      <!-- Centre : inscription du tapis, message, résultat -->
      <div class="relative flex w-full flex-1 flex-col items-center justify-center">
        <template v-if="store.rules">
          <svg viewBox="0 0 400 60" class="felt-arc w-[min(80%,28rem)]" aria-hidden="true">
            <path id="felt-arc-path" d="M 20 12 Q 200 68 380 12" fill="none" />
            <text>
              <textPath href="#felt-arc-path" startOffset="50%" text-anchor="middle">
                BLACKJACK PAIE {{ store.rules.blackjackPayout[0] }} POUR
                {{ store.rules.blackjackPayout[1] }}
              </textPath>
            </text>
          </svg>
          <p class="felt-subtitle hidden text-center sm:block">
            Le croupier reste sur 17 · Assurance 2 pour 1
          </p>
        </template>

        <div class="mt-3 flex min-h-8 items-center">
          <p
            v-if="message"
            :key="message"
            class="animate-in rounded-full bg-background/70 px-4 py-1.5 text-center text-sm text-on-surface backdrop-blur-sm"
          >
            {{ message }}
          </p>
          <p v-else-if="!round" class="animate-in text-center text-sm text-on-surface/70">
            Choisissez vos jetons, puis distribuez.
          </p>
        </div>

        <!-- Résultat, par-dessus l'inscription -->
        <div
          v-if="outcome"
          :key="round?.id"
          class="animate-toast absolute z-10 rounded-2xl bg-background/80 px-7 py-3 text-center shadow-xl backdrop-blur-sm"
        >
          <p class="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            {{ outcome.title }}
          </p>
          <p
            class="text-3xl font-bold tabular-nums"
            :class="
              outcome.net > 0 ? 'text-success' : outcome.net < 0 ? 'text-error' : 'text-on-surface'
            "
          >
            {{ outcome.net > 0 ? '+' : '' }}{{ outcome.net }}
          </p>
        </div>
      </div>

      <!-- Joueur -->
      <div
        class="flex min-h-[calc(var(--card-h)+5rem)] w-full items-end justify-center gap-2 sm:gap-6"
      >
        <BlackjackHand
          v-for="(hand, index) in hands"
          :key="index"
          :label="hands.length > 1 ? `Main ${index + 1}` : 'Vous'"
          :cards="hand.visibleCards"
          :bet="hand.bet"
          :result="isSettledVisible ? hand.result : null"
          :active="
            !isAnimating && round?.phase === 'PLAYER_TURN' && index === round?.activeHandIndex
          "
          :deal-from="{ x: '30vw', y: '-40vh' }"
        />
      </div>
    </section>

    <!-- Barre de contrôle : toujours visible -->
    <footer class="shrink-0 rounded-2xl border border-line bg-surface/80 px-3 py-2.5 sm:px-4">
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

      <!-- Actions de jeu -->
      <div
        v-if="round && isPlaying"
        key="actions"
        class="flex flex-wrap items-center justify-center gap-2"
      >
        <v-btn
          v-for="action in round.availableActions"
          :key="action"
          :color="PRIMARY_ACTIONS.includes(action) ? 'primary' : undefined"
          :variant="PRIMARY_ACTIONS.includes(action) ? 'flat' : 'tonal'"
          rounded="pill"
          class="normal-case"
          :disabled="!canAct || actionCost(action) > walletStore.balance"
          @click="store.act(action)"
        >
          {{ ACTIONS[action].label }}
          <span v-if="actionCost(action)" class="ml-1 text-xs opacity-70 tabular-nums">
            +{{ actionCost(action) }}
          </span>
          <kbd class="kbd ml-2 hidden sm:inline-flex">{{ ACTIONS[action].key }}</kbd>
        </v-btn>
        <span v-if="!round.availableActions.length" class="py-1.5 text-sm text-muted">
          Le croupier joue…
        </span>
      </div>

      <!-- Mise -->
      <div
        v-else
        key="bet"
        class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-between"
      >
        <div class="flex items-center gap-2">
          <button
            v-for="chip in CHIP_VALUES"
            :key="chip"
            type="button"
            class="chip-button"
            :disabled="store.isBusy"
            :aria-label="`Ajouter un jeton de ${chip}`"
            @click="store.addChip(chip)"
          >
            <CasinoChip :value="chip" />
          </button>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-right leading-tight">
            <p class="text-xl font-bold text-primary tabular-nums">{{ store.bet }}</p>
            <p class="text-[0.7rem] text-muted">{{ betHint }}</p>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :disabled="!store.bet || store.isBusy"
            aria-label="Effacer la mise"
            @click="store.clearBet"
          />
          <v-btn
            color="primary"
            variant="flat"
            rounded="pill"
            size="large"
            class="normal-case font-semibold"
            :loading="store.isBusy"
            :disabled="!canDeal"
            @click="store.deal"
          >
            {{ round ? 'Rejouer' : 'Distribuer' }}
            <kbd class="kbd ml-2 hidden sm:inline-flex">↵</kbd>
          </v-btn>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 8rem = barre de navigation (4rem) + marges verticales du layout (2 × 2rem) */
.bj-screen {
  height: calc(100dvh - 8rem);
  min-height: 30rem;
  --card-h: clamp(3.75rem, 12.5dvh, 7.5rem);
}

.felt {
  background: radial-gradient(
    ellipse 80% 70% at 50% 40%,
    color-mix(in oklab, rgb(var(--v-theme-felt)) 72%, rgb(var(--v-theme-secondary)) 28%),
    rgb(var(--v-theme-felt)) 75%
  );
  box-shadow:
    inset 0 0 0 6px rgb(var(--v-theme-felt-rim)),
    inset 0 0 0 8px rgba(var(--v-theme-primary), 0.25),
    inset 0 12px 40px rgba(0, 0, 0, 0.45);
}
.felt.is-compact {
  --card-h: clamp(3.25rem, 9.5dvh, 6rem);
}

.felt-arc text {
  fill: rgba(var(--v-theme-primary), 0.55);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 15px;
  letter-spacing: 0.3em;
}
.felt-subtitle {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.65rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-primary), 0.4);
}

.shoe {
  display: flex;
}
.shoe-card {
  width: calc(var(--card-h) * 0.42);
  aspect-ratio: 5 / 7;
  border-radius: 4px;
  border: 2px solid rgb(var(--v-theme-card));
  background: rgb(var(--v-theme-card-back));
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}
.shoe-card + .shoe-card {
  margin-left: calc(var(--card-h) * -0.36);
}

.chip-button {
  border-radius: 9999px;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.chip-button:hover:not(:disabled) {
  transform: translateY(-3px);
}
.chip-button:active:not(:disabled) {
  transform: translateY(0) scale(0.94);
}
.chip-button:disabled {
  opacity: 0.4;
}
.chip-button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.kbd {
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 0.3rem;
  border: 1px solid currentColor;
  font-family: ui-monospace, monospace;
  font-size: 0.65rem;
  opacity: 0.55;
}

/* Animations d'entrée uniquement : rien n'attend la fin d'une sortie, les contrôles ne restent jamais bloqués */
.animate-in {
  animation: swap-in 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.animate-toast {
  animation: toast-in 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes swap-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
@keyframes toast-in {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-in,
  .animate-toast {
    animation-duration: 1ms;
  }
}
</style>
