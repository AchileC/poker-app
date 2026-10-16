import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppException } from '../../common/errors/app.exception';
import { WalletService } from '../../common/wallet/wallet.service';
import { BlackjackRoundStore } from './blackjack.store';
import {
  actionCost,
  applyAction,
  availableActions,
  createShoe,
  dealRound,
  totalPayout,
} from './engine/blackjack.engine';
import { TABLE_RULES } from './engine/blackjack.rules';
import { BlackjackAction, Card, Round, TableRules, TableType } from './engine/blackjack.types';
import { RoundView, toRoundView } from './engine/blackjack.view';

/** Fabrique de sabots, injectable pour des tests déterministes. */
export const SHOE_FACTORY = Symbol('SHOE_FACTORY');
export type ShoeFactory = (decks: number) => Card[];

export interface RoundResponse {
  round: RoundView | null;
  newBalance: number;
}

@Injectable()
export class BlackjackService {
  /** Parties (ou joueurs, pour le démarrage) en cours de traitement : refuse les requêtes concurrentes. */
  private readonly locks = new Set<string>();

  constructor(
    private readonly walletService: WalletService,
    private readonly store: BlackjackRoundStore,
    @Inject(SHOE_FACTORY) private readonly shoeFactory: ShoeFactory,
  ) {}

  getTables(): TableRules[] {
    return Object.values(TABLE_RULES);
  }

  async startRound(userId: string, table: TableType, bet: number): Promise<RoundResponse> {
    const rules = TABLE_RULES[table];
    if (!Number.isInteger(bet) || bet < rules.minBet || bet > rules.maxBet) {
      throw new AppException(
        'BLACKJACK_INVALID_BET',
        `La mise doit être un entier entre ${rules.minBet} et ${rules.maxBet}.`,
        HttpStatus.BAD_REQUEST,
        { minBet: rules.minBet, maxBet: rules.maxBet },
      );
    }

    return this.withLock(`user:${userId}`, async () => {
      if (this.store.getActive(userId)) {
        throw new AppException(
          'BLACKJACK_ROUND_IN_PROGRESS',
          'Une partie est déjà en cours : terminez-la avant d’en commencer une autre.',
          HttpStatus.CONFLICT,
        );
      }

      const roundId = randomUUID();
      await this.walletService.debit(userId, bet, 'BLACKJACK', `blackjack:${roundId}:h0:bet`);
      const round = dealRound(roundId, rules, bet, this.shoeFactory(rules.decks));
      return this.commit(userId, round, 0);
    });
  }

  async getCurrent(userId: string): Promise<RoundResponse> {
    const stored = this.store.getActive(userId);
    return {
      round: stored ? toRoundView(stored.round, stored.version) : null,
      newBalance: await this.walletService.getBalance(userId),
    };
  }

  async act(
    userId: string,
    roundId: string,
    action: BlackjackAction,
    version: number,
  ): Promise<RoundResponse> {
    return this.withLock(`round:${roundId}`, async () => {
      const stored = this.store.get(roundId);
      if (!stored || stored.userId !== userId) {
        throw new AppException('GAME_NOT_FOUND', 'Partie introuvable.', HttpStatus.NOT_FOUND);
      }
      if (stored.version !== version) {
        throw new AppException(
          'BLACKJACK_STALE_STATE',
          'La partie a changé entre-temps : rechargez son état.',
          HttpStatus.CONFLICT,
          { currentVersion: stored.version },
        );
      }
      if (!availableActions(stored.round).includes(action)) {
        throw new AppException(
          'INVALID_ACTION',
          `Action ${action} impossible dans l'état actuel de la partie.`,
          HttpStatus.BAD_REQUEST,
          { availableActions: availableActions(stored.round) },
        );
      }

      // Débit AVANT d'appliquer l'action : en cas de solde insuffisant, la partie ne bouge pas
      const cost = actionCost(stored.round, action);
      if (cost > 0) {
        await this.walletService.debit(
          userId,
          cost,
          'BLACKJACK',
          `blackjack:${roundId}:${costReference(stored.round, action)}`,
        );
      }

      return this.commit(userId, applyAction(stored.round, action), stored.version + 1);
    });
  }

  private async commit(userId: string, round: Round, version: number): Promise<RoundResponse> {
    this.store.save({ round, userId, version });

    const payout = round.phase === 'SETTLED' ? totalPayout(round) : 0;
    const newBalance =
      payout > 0
        ? (
            await this.walletService.credit(
              userId,
              payout,
              'BLACKJACK',
              `blackjack:${round.id}:payout`,
            )
          ).newBalance
        : await this.walletService.getBalance(userId);

    return { round: toRoundView(round, version), newBalance };
  }

  private async withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (this.locks.has(key)) {
      throw new AppException(
        'BLACKJACK_ACTION_IN_PROGRESS',
        'Une action est déjà en cours de traitement.',
        HttpStatus.CONFLICT,
      );
    }
    this.locks.add(key);
    try {
      return await task();
    } finally {
      this.locks.delete(key);
    }
  }
}

function costReference(round: Round, action: BlackjackAction): string {
  switch (action) {
    case 'DOUBLE':
      return `h${round.activeHandIndex}:double`;
    case 'SPLIT':
      return `h${round.hands.length}:bet`;
    default:
      return 'insurance';
  }
}

export const shoeFactoryProvider = { provide: SHOE_FACTORY, useValue: createShoe };
