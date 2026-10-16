import { TableRules, TableType } from './blackjack.types';

const COMMON = {
  decks: 6,
  minBet: 10,
  maxBet: 500,
  dealerHitsSoft17: false,
  blackjackPayout: [3, 2] as [number, number],
  doubleAfterSplit: true,
  insurance: true,
};

export const TABLE_RULES: Record<TableType, TableRules> = {
  VEGAS: {
    ...COMMON,
    table: 'VEGAS',
    name: 'Vegas',
    dealerPeeks: true,
    doubleOn: 'ANY',
    maxHands: 4,
    lateSurrender: true,
  },
  EUROPE: {
    ...COMMON,
    table: 'EUROPE',
    name: 'Europe',
    dealerPeeks: false,
    doubleOn: 'NINE_TO_ELEVEN',
    maxHands: 2,
    lateSurrender: false,
  },
};
