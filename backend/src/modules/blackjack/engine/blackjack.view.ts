import { availableActions, handValue, totalPayout } from './blackjack.engine';
import {
  BlackjackAction,
  Card,
  HandResult,
  HandStatus,
  InsuranceState,
  Round,
  RoundPhase,
  TableRules,
} from './blackjack.types';

export interface HandView {
  cards: Card[];
  value: number;
  soft: boolean;
  bet: number;
  status: HandStatus;
  doubled: boolean;
  fromSplit: boolean;
  result: HandResult | null;
  payout: number;
}

/** Ce que le client a le droit de voir : jamais le sabot, carte cachée à null. */
export interface RoundView {
  id: string;
  version: number;
  rules: TableRules;
  phase: RoundPhase;
  dealer: {
    /** `null` = carte face cachée. */
    cards: (Card | null)[];
    /** Valeur des cartes visibles uniquement. */
    value: number;
    soft: boolean;
  };
  hands: HandView[];
  activeHandIndex: number;
  insurance: InsuranceState | null;
  availableActions: BlackjackAction[];
  totalBet: number;
  /** Total rendu au joueur (mises comprises), une fois la partie réglée. */
  totalPayout: number | null;
}

export function toRoundView(round: Round, version: number): RoundView {
  const settled = round.phase === 'SETTLED';
  const visibleDealer = settled ? round.dealer : round.dealer.slice(0, 1);
  const hiddenCount = settled ? 0 : round.dealer.length - visibleDealer.length;
  const dealerValue = handValue(visibleDealer);

  return {
    id: round.id,
    version,
    rules: round.rules,
    phase: round.phase,
    dealer: {
      cards: [...visibleDealer, ...Array<null>(hiddenCount).fill(null)],
      value: dealerValue.total,
      soft: dealerValue.soft,
    },
    hands: round.hands.map((hand) => ({
      cards: hand.cards,
      value: handValue(hand.cards).total,
      soft: handValue(hand.cards).soft,
      bet: hand.bet,
      status: hand.status,
      doubled: hand.doubled,
      fromSplit: hand.fromSplit,
      result: hand.result,
      payout: hand.payout,
    })),
    activeHandIndex: round.activeHandIndex,
    insurance: round.insurance,
    availableActions: availableActions(round),
    totalBet: round.hands.reduce((sum, hand) => sum + hand.bet, 0) + (round.insurance?.bet ?? 0),
    totalPayout: settled ? totalPayout(round) : null,
  };
}
