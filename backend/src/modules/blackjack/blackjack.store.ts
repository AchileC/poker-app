import { Injectable } from '@nestjs/common';
import { Round } from './engine/blackjack.types';

export interface StoredRound {
  round: Round;
  userId: string;
  version: number;
}

/**
 * Stockage des parties en mémoire.
 * TODO (Postgres du Dev 2, CDC §4.4) : persister les parties en cours et, au redémarrage,
 * rembourser les mises engagées des parties non terminées.
 */
@Injectable()
export class BlackjackRoundStore {
  private readonly roundsById = new Map<string, StoredRound>();
  private readonly activeRoundByUser = new Map<string, string>();

  get(roundId: string): StoredRound | undefined {
    return this.roundsById.get(roundId);
  }

  getActive(userId: string): StoredRound | undefined {
    const roundId = this.activeRoundByUser.get(userId);
    return roundId ? this.roundsById.get(roundId) : undefined;
  }

  save(stored: StoredRound): void {
    this.roundsById.set(stored.round.id, stored);
    if (stored.round.phase === 'SETTLED') {
      this.activeRoundByUser.delete(stored.userId);
    } else {
      this.activeRoundByUser.set(stored.userId, stored.round.id);
    }
  }
}
