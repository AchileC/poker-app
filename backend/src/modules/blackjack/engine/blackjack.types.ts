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
  /** Le croupier tire-t-il sur soft 17 (H17) ? */
  dealerHitsSoft17: boolean;
  /** Carte cachée + vérification du blackjack croupier avant le tour du joueur (règle US). */
  dealerPeeks: boolean;
  /** Paiement du blackjack, ex : [3, 2]. */
  blackjackPayout: [number, number];
  /** 'ANY' : sur 2 cartes quelconques ; 'NINE_TO_ELEVEN' : seulement sur 9, 10 ou 11. */
  doubleOn: 'ANY' | 'NINE_TO_ELEVEN';
  doubleAfterSplit: boolean;
  /** Nombre maximum de mains après split. Split d'As : une carte par main, pas de re-split (toutes tables). */
  maxHands: number;
  lateSurrender: boolean;
  insurance: boolean;
}

export type RoundPhase = 'INSURANCE' | 'PLAYER_TURN' | 'SETTLED';

export type HandStatus = 'PLAYING' | 'STOOD' | 'BUST' | 'BLACKJACK' | 'SURRENDERED' | 'EVEN_MONEY';

export type HandResult = 'WIN' | 'BLACKJACK' | 'PUSH' | 'LOSE' | 'SURRENDER' | 'EVEN_MONEY';

export interface PlayerHand {
  cards: Card[];
  /** Mise totale de la main (double compris). */
  bet: number;
  status: HandStatus;
  doubled: boolean;
  fromSplit: boolean;
  result: HandResult | null;
  /** Montant rendu au joueur pour cette main (mise comprise), une fois réglée. */
  payout: number;
}

export interface InsuranceState {
  /** null : pas encore décidé ; 0 : refusée ; > 0 : montant misé. */
  bet: number | null;
  payout: number;
}

export type BlackjackAction =
  'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT' | 'SURRENDER' | 'INSURANCE' | 'EVEN_MONEY' | 'NO_INSURANCE';

/** État complet d'une partie — reste côté serveur (contient le sabot et la carte cachée). */
export interface Round {
  id: string;
  rules: TableRules;
  phase: RoundPhase;
  shoe: Card[];
  dealer: Card[];
  hands: PlayerHand[];
  activeHandIndex: number;
  insurance: InsuranceState | null;
}
