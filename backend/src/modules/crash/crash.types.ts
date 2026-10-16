export type CrashPhase = 'BETTING' | 'RUNNING' | 'CRASHED';

/** Mise d'un joueur — reste côté serveur. Multiplicateurs en centièmes (250 = 2,50×). */
export interface CrashBet {
  /** Identifiant opaque diffusé aux clients (jamais le userId, jamais « house »). */
  key: string;
  userId: string;
  username: string;
  amount: number;
  autoCashOut: number | null;
  cashedOutAt: number | null;
  payout: number;
  /** Joueur de la maison : n'utilise pas le wallet. */
  isHouse: boolean;
}

export interface CrashRound {
  id: string;
  number: number;
  phase: CrashPhase;
  /** Secret jusqu'au crash. */
  seed: string;
  seedHash: string;
  /** Secret jusqu'au crash. */
  crashPoint: number;
  bettingEndsAt: number;
  startedAt: number | null;
  crashedAt: number | null;
  bets: Map<string, CrashBet>;
}

export interface PublicPlayer {
  key: string;
  username: string;
  amount: number;
  cashedOutAt: number | null;
  payout: number;
}

export interface CrashHistoryEntry {
  number: number;
  crashPoint: number;
  seedHash: string;
  seed: string;
}

export interface CrashSnapshot {
  roundId: string;
  number: number;
  phase: CrashPhase;
  seedHash: string;
  bettingEndsAt: number;
  startedAt: number | null;
  /** null tant que la partie n'a pas crashé. */
  crashPoint: number | null;
  /** null tant que la partie n'a pas crashé. */
  seed: string | null;
  serverNow: number;
  players: PublicPlayer[];
  history: CrashHistoryEntry[];
  myBet: Pick<CrashBet, 'amount' | 'autoCashOut' | 'cashedOutAt' | 'payout'> | null;
  limits: { minBet: number; maxBet: number; minAutoCashOut: number; maxMultiplier: number };
}

/** Diffusion des événements, branchée par le gateway WebSocket. */
export interface CrashEmitter {
  toAll(event: string, payload: unknown): void;
  toUser(userId: string, event: string, payload: unknown): void;
}
