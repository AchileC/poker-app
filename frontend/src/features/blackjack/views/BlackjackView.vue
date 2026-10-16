<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useWalletStore } from '@/core/stores/useWalletStore';
import BlackjackHand from '../components/BlackjackHand.vue';
import { CHIP_VALUES, useBlackjackStore } from '../stores/useBlackjackStore';
import type { BlackjackAction, TableRules } from '../types';

const store = useBlackjackStore();
const walletStore = useWalletStore();

onMounted(() => {
  void store.init();
});

const ACTION_LABELS: Record<BlackjackAction, string> = {
  HIT: 'Tirer',
  STAND: 'Rester',
  DOUBLE: 'Doubler',
  SPLIT: 'Séparer',
  SURRENDER: 'Abandonner',
  INSURANCE: 'Assurance',
  EVEN_MONEY: 'Even money',
  NO_INSURANCE: "Pas d'assurance",
};

const ACTION_COLORS: Partial<Record<BlackjackAction, string>> = {
  HIT: 'primary',
  STAND: 'secondary',
  INSURANCE: 'primary',
  EVEN_MONEY: 'primary',
};

const CHIP_CLASSES: Record<(typeof CHIP_VALUES)[number], string> = {
  5: 'bg-chip-5',
  25: 'bg-chip-25',
  100: 'bg-chip-100',
  500: 'bg-chip-500',
};

const round = computed(() => store.round);
const phaseMessage = computed(() => {
  if (!round.value) return null;
  if (round.value.phase === 'INSURANCE') {
    const cost = Math.floor(round.value.hands[0]!.bet / 2);
    return round.value.availableActions.includes('EVEN_MONEY')
      ? 'Blackjack face à un As : prendre even money (payé 1:1 tout de suite) ?'
      : `Le croupier montre un As : assurance pour ${cost} jetons ?`;
  }
  if (round.value.phase === 'PLAYER_TURN' && round.value.hands.length > 1) {
    return `Main ${round.value.activeHandIndex + 1} sur ${round.value.hands.length}`;
  }
  return null;
});

const netResult = computed(() => {
  const current = round.value;
  if (!current || current.totalPayout === null) return null;
  return current.totalPayout - current.totalBet;
});

const canDeal = computed(() => {
  const rules = store.rules;
  return (
    !!rules &&
    !store.isPlaying &&
    !store.isBusy &&
    store.bet >= rules.minBet &&
    store.bet <= rules.maxBet &&
    store.bet <= walletStore.balance
  );
});

/** Coût d'une action pour l'afficher sur le bouton (et le griser si le solde ne suffit pas). */
function actionCost(action: BlackjackAction): number {
  const current = round.value;
  if (!current) return 0;
  if (action === 'DOUBLE' || action === 'SPLIT') return current.hands[current.activeHandIndex]!.bet;
  if (action === 'INSURANCE') return Math.floor(current.hands[0]!.bet / 2);
  return 0;
}

function rulesSummary(rules: TableRules): string[] {
  return [
    `Mise ${rules.minBet}–${rules.maxBet}`,
    `Blackjack payé ${rules.blackjackPayout[0]}:${rules.blackjackPayout[1]}`,
    rules.dealerPeeks ? 'Carte cachée (vérif. blackjack)' : 'Sans carte cachée',
    rules.doubleOn === 'ANY' ? 'Double sur 2 cartes' : 'Double sur 9, 10, 11',
    `Split jusqu'à ${rules.maxHands} mains`,
    rules.lateSurrender ? 'Abandon autorisé' : 'Sans abandon',
  ];
}
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <span class="font-mono text-xs text-primary"
          >Périmètre Dev 3 • Blackjack (Joueur vs Banque)</span
        >
        <h1 class="mt-1 text-2xl font-bold text-on-surface">Table de Blackjack</h1>
      </div>

      <v-btn-toggle
        v-model="store.selectedTable"
        mandatory
        color="primary"
        variant="outlined"
        density="comfortable"
        :disabled="store.isPlaying || store.isBusy"
      >
        <v-btn
          v-for="table in store.tables"
          :key="table.table"
          :value="table.table"
          class="normal-case"
        >
          {{ table.table === 'VEGAS' ? '🇺🇸' : '🇫🇷' }} {{ table.name }}
        </v-btn>
      </v-btn-toggle>
    </div>

    <div v-if="store.rules" class="flex flex-wrap gap-2">
      <v-chip v-for="rule in rulesSummary(store.rules)" :key="rule" size="small" variant="tonal">
        {{ rule }}
      </v-chip>
    </div>

    <v-alert
      v-if="store.error"
      type="error"
      variant="tonal"
      closable
      @click:close="store.error = null"
    >
      {{ store.error }}
    </v-alert>

    <!-- Tapis -->
    <div
      class="flex min-h-96 flex-col justify-between gap-6 rounded-[2.5rem] border-8 border-felt-rim bg-felt p-4 shadow-inner sm:p-8"
    >
      <div class="flex justify-center">
        <BlackjackHand
          v-if="round"
          label="Croupier"
          :cards="round.dealer.cards"
          :value="round.dealer.value"
          :soft="round.dealer.soft"
        />
        <p v-else class="py-10 text-center text-muted">Placez votre mise pour commencer.</p>
      </div>

      <div class="text-center font-serif text-xs uppercase tracking-[0.3em] text-primary/70">
        <template v-if="store.rules">
          Blackjack paie {{ store.rules.blackjackPayout[0] }} pour
          {{ store.rules.blackjackPayout[1] }}
          • Le croupier reste sur 17 • Assurance paie 2 pour 1
        </template>
      </div>

      <div v-if="round" class="flex flex-wrap justify-center gap-4">
        <BlackjackHand
          v-for="(hand, index) in round.hands"
          :key="index"
          :label="round.hands.length > 1 ? `Main ${index + 1}` : 'Vous'"
          :cards="hand.cards"
          :value="hand.value"
          :soft="hand.soft"
          :bet="hand.bet"
          :result="hand.result"
          :active="round.phase === 'PLAYER_TURN' && index === round.activeHandIndex"
        />
      </div>
    </div>

    <!-- Partie en cours : actions -->
    <div v-if="round && store.isPlaying" class="space-y-3 text-center">
      <p v-if="phaseMessage" class="text-sm text-on-surface">{{ phaseMessage }}</p>
      <div class="flex flex-wrap justify-center gap-3">
        <v-btn
          v-for="action in round.availableActions"
          :key="action"
          :color="ACTION_COLORS[action] ?? 'surface-bright'"
          variant="flat"
          size="large"
          class="normal-case"
          :loading="store.isBusy"
          :disabled="actionCost(action) > walletStore.balance"
          @click="store.act(action)"
        >
          {{ ACTION_LABELS[action] }}
          <span v-if="actionCost(action)" class="ml-1 text-xs opacity-70">
            (+{{ actionCost(action) }})
          </span>
        </v-btn>
      </div>
    </div>

    <!-- Hors partie : résultat + mise -->
    <div v-else class="space-y-5">
      <div v-if="netResult !== null" class="text-center">
        <p
          class="text-2xl font-bold"
          :class="netResult > 0 ? 'text-success' : netResult < 0 ? 'text-error' : 'text-info'"
        >
          {{ netResult > 0 ? `+${netResult}` : netResult }} jetons
        </p>
        <p class="text-sm text-muted">
          Misé {{ round?.totalBet }} • Rendu {{ round?.totalPayout }}
        </p>
      </div>

      <div
        class="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:justify-between"
      >
        <div class="flex gap-3">
          <button
            v-for="chip in CHIP_VALUES"
            :key="chip"
            type="button"
            class="flex h-14 w-14 items-center justify-center rounded-full border-4 border-dashed border-card/80 text-sm font-bold text-card shadow-lg transition-transform hover:-translate-y-1 disabled:opacity-40"
            :class="CHIP_CLASSES[chip]"
            :disabled="store.isBusy"
            :aria-label="`Ajouter un jeton de ${chip}`"
            @click="store.addChip(chip)"
          >
            {{ chip }}
          </button>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-xs text-muted">Mise</p>
            <p class="text-xl font-bold text-primary">{{ store.bet }}</p>
          </div>
          <v-btn variant="text" class="normal-case" :disabled="!store.bet" @click="store.clearBet">
            Effacer
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            class="normal-case font-bold"
            :loading="store.isBusy"
            :disabled="!canDeal"
            @click="store.deal"
          >
            {{ round ? 'Rejouer' : 'Distribuer' }}
          </v-btn>
        </div>
      </div>
      <p
        v-if="store.rules && store.bet && store.bet < store.rules.minBet"
        class="text-center text-xs text-muted"
      >
        Mise minimum : {{ store.rules.minBet }}
      </p>
    </div>
  </div>
</template>
