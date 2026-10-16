// Miroir des vues renvoyées par l'API (backend/src/modules/blackjack/engine/blackjack.view.ts)

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type TableType = 'VEGAS' | 'EUROPE';

export interface TableRules {
  table: TableType;
  name: string;
  decks: number;
  minBet: number;
  maxBet: number;
  dealerHitsSoft17: boolean;
  dealerPeeks: boolean;
  blackjackPayout: [number, number];
  doubleOn: 'ANY' | 'NINE_TO_ELEVEN';
  doubleAfterSplit: boolean;
  maxHands: number;
  lateSurrender: boolean;
  insurance: boolean;
}

export type RoundPhase = 'INSURANCE' | 'PLAYER_TURN' | 'SETTLED';
export type HandStatus = 'PLAYING' | 'STOOD' | 'BUST' | 'BLACKJACK' | 'SURRENDERED' | 'EVEN_MONEY';
export type HandResult = 'WIN' | 'BLACKJACK' | 'PUSH' | 'LOSE' | 'SURRENDER' | 'EVEN_MONEY';

export type BlackjackAction =
  'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT' | 'SURRENDER' | 'INSURANCE' | 'EVEN_MONEY' | 'NO_INSURANCE';

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

export interface RoundView {
  id: string;
  version: number;
  rules: TableRules;
  phase: RoundPhase;
  dealer: { cards: (Card | null)[]; value: number; soft: boolean };
  hands: HandView[];
  activeHandIndex: number;
  insurance: { bet: number | null; payout: number } | null;
  availableActions: BlackjackAction[];
  totalBet: number;
  totalPayout: number | null;
}

export interface RoundResponse {
  round: RoundView | null;
  newBalance: number;
}
