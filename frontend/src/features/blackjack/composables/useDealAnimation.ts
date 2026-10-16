import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import type { Card, HandView, RoundView } from '../types';
import { handValue } from '../utils';

/**
 * Rejoue côté client, carte par carte, ce que le serveur a déjà décidé.
 * Le serveur renvoie l'état final d'une action en une réponse ; ce séquenceur affiche
 * les nouvelles cartes une à une dans l'ordre du croupier (joueur, croupier, joueur,
 * carte cachée), retourne la carte cachée, puis fait tirer le croupier.
 * Purement visuel : aucune information n'est révélée plus tôt que le serveur ne l'a envoyée.
 */

type Step = { kind: 'hand'; hand: number } | { kind: 'dealer' } | { kind: 'flip' };

interface Shown {
  dealer: number;
  /** La 2e carte du croupier (carte cachée, table Vegas) reste face cachée tant que true. */
  holeHidden: boolean;
  hands: number[];
}

const STEP_DELAY_MS: Record<Step['kind'], number> = {
  hand: 320,
  dealer: 520,
  flip: 480,
};

export interface DisplayedHand extends HandView {
  visibleCards: Card[];
}

export function useDealAnimation(round: Ref<RoundView | null>, shouldSkip: () => boolean) {
  const shown = ref<Shown | null>(null);
  const isAnimating = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  function fullyShown(target: RoundView): Shown {
    return {
      dealer: target.dealer.cards.length,
      holeHidden: false,
      hands: target.hands.map((hand) => hand.cards.length),
    };
  }

  function applyStep(state: Shown, step: Step): Shown {
    if (step.kind === 'hand') {
      const hands = [...state.hands];
      hands[step.hand] = (hands[step.hand] ?? 0) + 1;
      return { ...state, hands };
    }
    if (step.kind === 'dealer') return { ...state, dealer: state.dealer + 1 };
    return { ...state, holeHidden: false };
  }

  /** Étapes pour passer de l'état affiché à l'état final du serveur. */
  function remainingSteps(from: Shown, target: RoundView): Step[] {
    const steps: Step[] = [];
    target.hands.forEach((hand, index) => {
      for (let count = from.hands[index] ?? 0; count < hand.cards.length; count++) {
        steps.push({ kind: 'hand', hand: index });
      }
    });
    const holeCard = target.dealer.cards[1];
    if (target.rules.dealerPeeks && from.holeHidden && from.dealer >= 2 && holeCard) {
      steps.push({ kind: 'flip' });
    }
    for (let count = from.dealer; count < target.dealer.cards.length; count++) {
      steps.push({ kind: 'dealer' });
    }
    return steps;
  }

  function play(start: Shown, steps: Step[]) {
    shown.value = start;
    isAnimating.value = steps.length > 0;

    const runStep = (index: number) => {
      const step = steps[index];
      if (!step) {
        isAnimating.value = false;
        return;
      }
      shown.value = applyStep(shown.value!, step);
      const next = steps[index + 1];
      timer = setTimeout(() => runStep(index + 1), next ? STEP_DELAY_MS[next.kind] : 450);
    };
    runStep(0);
  }

  // flush 'sync' : réagit au moment même où la partie change (le drapeau de reprise est encore lu)
  watch(
    round,
    (next, previous) => {
      clearTimeout(timer);

      if (!next) {
        shown.value = null;
        isAnimating.value = false;
        return;
      }
      if (prefersReducedMotion || shouldSkip()) {
        shown.value = fullyShown(next);
        isAnimating.value = false;
        return;
      }

      // Nouvelle partie : distribution initiale dans l'ordre du croupier
      if (!previous || previous.id !== next.id || !shown.value) {
        let state: Shown = { dealer: 0, holeHidden: true, hands: next.hands.map(() => 0) };
        const opening: Step[] = [
          { kind: 'hand', hand: 0 },
          { kind: 'dealer' },
          { kind: 'hand', hand: 0 },
        ];
        if (next.rules.dealerPeeks) opening.push({ kind: 'dealer' });
        const start = state;
        state = opening.reduce(applyStep, state);
        play(start, [...opening, ...remainingSteps(state, next)]);
        return;
      }

      // Action sur la partie en cours : on repart de l'état précédent entièrement affiché
      const base = fullyShown(previous);
      base.holeHidden = previous.rules.dealerPeeks && previous.dealer.cards[1] === null;
      if (next.hands.length > previous.hands.length) {
        // Split : la main active devient deux mains d'une carte chacune
        base.hands.splice(previous.activeHandIndex, 1, 1, 1);
      }
      play(base, remainingSteps(base, next));
    },
    { flush: 'sync' },
  );

  onBeforeUnmount(() => clearTimeout(timer));

  const dealerCards = computed<(Card | null)[]>(() => {
    const current = round.value;
    const state = shown.value;
    if (!current || !state) return [];
    return current.dealer.cards
      .slice(0, state.dealer)
      .map((card, index) =>
        index === 1 && state.holeHidden && current.rules.dealerPeeks ? null : card,
      );
  });

  const hands = computed<DisplayedHand[]>(() => {
    const current = round.value;
    const state = shown.value;
    if (!current || !state) return [];
    return current.hands.map((hand, index) => ({
      ...hand,
      visibleCards: hand.cards.slice(0, state.hands[index] ?? hand.cards.length),
    }));
  });

  const dealerValue = computed(() => handValue(dealerCards.value));

  return { dealerCards, dealerValue, hands, isAnimating };
}
