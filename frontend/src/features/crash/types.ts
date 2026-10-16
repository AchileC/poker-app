// Miroir des événements du namespace WebSocket /crash (backend/src/modules/crash/crash.types.ts).
// Multiplicateurs en centièmes entiers : 250 = 2,50×.

export type CrashPhase = 'BETTING' | 'RUNNING' | 'CRASHED';

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

export interface MyBet {
  amount: number;
  autoCashOut: number | null;
  cashedOutAt: number | null;
  payout: number;
}

export interface CrashSnapshot {
  roundId: string;
  number: number;
  phase: CrashPhase;
  seedHash: string;
  bettingEndsAt: number;
  startedAt: number | null;
  crashPoint: number | null;
  seed: string | null;
  serverNow: number;
  players: PublicPlayer[];
  history: CrashHistoryEntry[];
  myBet: MyBet | null;
  limits: { minBet: number; maxBet: number; minAutoCashOut: number; maxMultiplier: number };
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export type CrashAck<T> = ({ ok: true } & T) | { ok: false; error: ApiErrorBody };
