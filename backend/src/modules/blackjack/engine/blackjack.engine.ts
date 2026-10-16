import { cryptoShuffle } from '../../../common/utils/csprng.util';
import {
  BlackjackAction,
  Card,
  HandResult,
  PlayerHand,
  Rank,
  Round,
  RoundPhase,
  Suit,
  TableRules,
} from './blackjack.types';

/**
 * Moteur de Blackjack pur : aucune dépendance Nest, wallet ou stockage.
 * Toutes les fonctions publiques renvoient une nouvelle partie (l'entrée n'est jamais modifiée).
 * Les cartes sont tirées dans l'ordre du sabot (`round.shoe[0]` en premier), ce qui rend
 * les tests déterministes avec un sabot construit à la main.
 */

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export class IllegalActionError extends Error {}

export function createShoe(decks: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
  }
  return cryptoShuffle(cards);
}

/** Valeur d'une carte, As compté 1. */
export function cardValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return Number(card.rank);
}

/** Total d'une main : un As compte 11 si ça ne fait pas dépasser 21 (main « soft »). */
export function handValue(cards: Card[]): { total: number; soft: boolean } {
  const hard = cards.reduce((sum, card) => sum + cardValue(card), 0);
  const hasAce = cards.some((card) => card.rank === 'A');
  if (hasAce && hard + 10 <= 21) {
    return { total: hard + 10, soft: true };
  }
  return { total: hard, soft: false };
}

/** Blackjack naturel : 21 en 2 cartes, hors main issue d'un split. */
export function isBlackjack(cards: Card[], fromSplit = false): boolean {
  return !fromSplit && cards.length === 2 && handValue(cards).total === 21;
}

export function dealerShouldHit(cards: Card[], rules: TableRules): boolean {
  const { total, soft } = handValue(cards);
  return total < 17 || (total === 17 && soft && rules.dealerHitsSoft17);
}

export function insuranceCost(round: Round): number {
  return Math.floor(round.hands[0]!.bet / 2);
}

/** Montant à débiter du wallet AVANT d'appliquer l'action. */
export function actionCost(round: Round, action: BlackjackAction): number {
  switch (action) {
    case 'DOUBLE':
    case 'SPLIT':
      return round.hands[round.activeHandIndex]!.bet;
    case 'INSURANCE':
      return insuranceCost(round);
    default:
      return 0;
  }
}

/** Total rendu au joueur une fois la partie réglée (mises comprises). */
export function totalPayout(round: Round): number {
  const hands = round.hands.reduce((sum, hand) => sum + hand.payout, 0);
  return hands + (round.insurance?.payout ?? 0);
}

export function availableActions(round: Round): BlackjackAction[] {
  if (round.phase === 'SETTLED') return [];

  if (round.phase === 'INSURANCE') {
    return isBlackjack(round.hands[0]!.cards)
      ? ['EVEN_MONEY', 'NO_INSURANCE']
      : ['INSURANCE', 'NO_INSURANCE'];
  }

  const hand = round.hands[round.activeHandIndex];
  if (!hand || hand.status !== 'PLAYING') return [];

  const { rules } = round;
  const actions: BlackjackAction[] = ['HIT', 'STAND'];
  const twoCards = hand.cards.length === 2;
  const total = handValue(hand.cards).total;

  const doubleAllowedOnTotal = rules.doubleOn === 'ANY' || (total >= 9 && total <= 11);
  if (twoCards && (!hand.fromSplit || rules.doubleAfterSplit) && doubleAllowedOnTotal) {
    actions.push('DOUBLE');
  }
  if (
    twoCards &&
    cardValue(hand.cards[0]!) === cardValue(hand.cards[1]!) &&
    round.hands.length < rules.maxHands
  ) {
    actions.push('SPLIT');
  }
  if (rules.lateSurrender && twoCards && round.hands.length === 1 && !hand.fromSplit) {
    actions.push('SURRENDER');
  }
  return actions;
}

/**
 * Distribue une nouvelle partie. Ordre : joueur, croupier (face visible), joueur,
 * puis carte cachée du croupier uniquement si la table la prévoit (Vegas).
 */
export function dealRound(id: string, rules: TableRules, bet: number, shoe: Card[]): Round {
  const round: Round = {
    id,
    rules,
    phase: 'PLAYER_TURN',
    shoe: [...shoe],
    dealer: [],
    hands: [],
    activeHandIndex: 0,
    insurance: null,
  };

  const first = draw(round);
  round.dealer.push(draw(round));
  const second = draw(round);
  if (rules.dealerPeeks) {
    round.dealer.push(draw(round));
  }
  round.hands.push(newHand([first, second], bet, false));

  if (rules.insurance && round.dealer[0]!.rank === 'A') {
    round.phase = 'INSURANCE';
    round.insurance = { bet: null, payout: 0 };
    return round;
  }
  return resolveOpening(round);
}

export function applyAction(input: Round, action: BlackjackAction): Round {
  if (!availableActions(input).includes(action)) {
    throw new IllegalActionError(`Action ${action} impossible dans l'état actuel de la partie.`);
  }

  const round = structuredClone(input);
  const hand = round.hands[round.activeHandIndex]!;

  switch (action) {
    case 'INSURANCE':
      round.insurance!.bet = insuranceCost(round);
      return resolveOpening(round);

    case 'NO_INSURANCE':
      round.insurance!.bet = 0;
      return resolveOpening(round);

    case 'EVEN_MONEY':
      round.insurance!.bet = 0;
      round.hands[0]!.status = 'EVEN_MONEY';
      return finishPlayerTurn(round);

    case 'HIT': {
      hand.cards.push(draw(round));
      const { total } = handValue(hand.cards);
      if (total > 21) hand.status = 'BUST';
      else if (total === 21) hand.status = 'STOOD';
      return advance(round);
    }

    case 'STAND':
      hand.status = 'STOOD';
      return advance(round);

    case 'DOUBLE':
      hand.bet *= 2;
      hand.doubled = true;
      hand.cards.push(draw(round));
      hand.status = handValue(hand.cards).total > 21 ? 'BUST' : 'STOOD';
      return advance(round);

    case 'SURRENDER':
      hand.status = 'SURRENDERED';
      return advance(round);

    case 'SPLIT': {
      const [left, right] = hand.cards as [Card, Card];
      const splitAces = left.rank === 'A';
      const leftHand = newHand([left, draw(round)], hand.bet, true);
      const rightHand = newHand([right, draw(round)], hand.bet, true);

      for (const splitHand of [leftHand, rightHand]) {
        // As splittés : une seule carte chacun. Un 21 après split s'arrête (payé 1:1).
        if (splitAces || handValue(splitHand.cards).total === 21) {
          splitHand.status = 'STOOD';
        }
      }
      round.hands.splice(round.activeHandIndex, 1, leftHand, rightHand);
      return advance(round);
    }
  }
}

function newHand(cards: Card[], bet: number, fromSplit: boolean): PlayerHand {
  return {
    cards,
    bet,
    status: 'PLAYING',
    doubled: false,
    fromSplit,
    result: null,
    payout: 0,
  };
}

function draw(round: Round): Card {
  const card = round.shoe.shift();
  if (!card) {
    throw new Error('Sabot vide.');
  }
  return card;
}

/** Après la distribution (et la décision d'assurance) : vérification croupier et blackjack joueur. */
function resolveOpening(round: Round): Round {
  round.phase = 'PLAYER_TURN';

  const hand = round.hands[0]!;
  if (isBlackjack(hand.cards)) {
    hand.status = 'BLACKJACK';
  }

  // Vegas : le croupier vérifie son blackjack avant que le joueur ne joue
  if (round.rules.dealerPeeks && isBlackjack(round.dealer)) {
    return settle(round);
  }
  return hand.status === 'BLACKJACK' ? finishPlayerTurn(round) : round;
}

/** Passe à la prochaine main encore en jeu, ou au tour du croupier. */
function advance(round: Round): Round {
  const next = round.hands.findIndex(
    (hand, index) => index >= round.activeHandIndex && hand.status === 'PLAYING',
  );
  if (next === -1) {
    return finishPlayerTurn(round);
  }
  round.activeHandIndex = next;
  return round;
}

function finishPlayerTurn(round: Round): Round {
  const hasStoodHand = round.hands.some((hand) => hand.status === 'STOOD');
  const needsDealerCards =
    hasStoodHand ||
    round.hands.some((hand) => hand.status === 'BLACKJACK') ||
    (round.insurance?.bet ?? 0) > 0;

  // Europe : le croupier ne tire sa 2e carte qu'après le tour du joueur
  if (!round.rules.dealerPeeks && needsDealerCards) {
    round.dealer.push(draw(round));
  }

  if (hasStoodHand && !isBlackjack(round.dealer)) {
    while (dealerShouldHit(round.dealer, round.rules)) {
      round.dealer.push(draw(round));
    }
  }
  return settle(round);
}

function settle(round: Round): Round {
  const dealerBlackjack = isBlackjack(round.dealer);
  const dealerTotal = handValue(round.dealer).total;
  const [numerator, denominator] = round.rules.blackjackPayout;

  for (const hand of round.hands) {
    const { result, payout } = settleHand(
      hand,
      dealerBlackjack,
      dealerTotal,
      numerator,
      denominator,
    );
    hand.result = result;
    hand.payout = payout;
  }

  if (round.insurance && round.insurance.bet !== null && round.insurance.bet > 0) {
    round.insurance.payout = dealerBlackjack ? round.insurance.bet * 3 : 0;
  }

  round.phase = 'SETTLED' satisfies RoundPhase;
  return round;
}

function settleHand(
  hand: PlayerHand,
  dealerBlackjack: boolean,
  dealerTotal: number,
  numerator: number,
  denominator: number,
): { result: HandResult; payout: number } {
  switch (hand.status) {
    case 'SURRENDERED':
      return { result: 'SURRENDER', payout: Math.floor(hand.bet / 2) };
    case 'EVEN_MONEY':
      return { result: 'EVEN_MONEY', payout: hand.bet * 2 };
    case 'BUST':
      return { result: 'LOSE', payout: 0 };
    case 'BLACKJACK':
      return dealerBlackjack
        ? { result: 'PUSH', payout: hand.bet }
        : {
            result: 'BLACKJACK',
            payout: hand.bet + Math.floor((hand.bet * numerator) / denominator),
          };
    default: {
      // STOOD, ou PLAYING si le croupier a révélé un blackjack avant le tour du joueur
      if (dealerBlackjack) return { result: 'LOSE', payout: 0 };
      const playerTotal = handValue(hand.cards).total;
      if (dealerTotal > 21 || playerTotal > dealerTotal)
        return { result: 'WIN', payout: hand.bet * 2 };
      if (playerTotal === dealerTotal) return { result: 'PUSH', payout: hand.bet };
      return { result: 'LOSE', payout: 0 };
    }
  }
}
