export type GameType = 'POKER' | 'BLACKJACK' | 'ROULETTE';

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  avatarUrl?: string;
  createdAt?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  gameType: GameType;
  referenceId: string;
  balanceAfter: number;
  createdAt: string;
}

export interface TransactionResult {
  success: boolean;
  newBalance: number;
  transaction: WalletTransaction;
}
