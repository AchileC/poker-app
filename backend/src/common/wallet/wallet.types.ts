/** 'SHOP' : rechargements gratuits de jetons (boutique, Dev 2). */
export type GameType = 'POKER' | 'BLACKJACK' | 'ROULETTE' | 'SHOP';

export type TransactionType = 'DEBIT' | 'CREDIT';

export interface TransactionRecord {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  gameType: GameType;
  referenceId: string;
  balanceAfter: number;
  createdAt: Date;
}

export interface TransactionResult {
  success: boolean;
  newBalance: number;
  transaction: TransactionRecord;
}
