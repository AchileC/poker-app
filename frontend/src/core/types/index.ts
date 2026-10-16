/** 'SHOP' : rechargements gratuits de jetons (boutique). */
export type GameType = 'POKER' | 'BLACKJACK' | 'ROULETTE' | 'SHOP';

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

/** Format d'erreur API commun (Section 4.5 du Cahier des Charges), REST et WebSocket. */
export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}
