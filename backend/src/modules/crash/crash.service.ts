import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../common/auth/auth-user';
import { AppException } from '../../common/errors/app.exception';
import { WalletService } from '../../common/wallet/wallet.service';
import { CrashBots, HouseBetPlan } from './crash.bots';
import {
  CrashBet,
  CrashEmitter,
  CrashHistoryEntry,
  CrashRound,
  CrashSnapshot,
  PublicPlayer,
} from './crash.types';
import {
  MAX_MULTIPLIER,
  crashPointForRound,
  generateSeed,
  hashSeed,
  multiplierAt,
  payoutFor,
  timeToReach,
} from './engine/crash.math';

export const BETTING_MS = 8000;
export const PAUSE_MS = 3000;
export const MIN_BET = 10;
export const MAX_BET = 1000;
export const MIN_AUTO_CASH_OUT = 101;
const HISTORY_SIZE = 30;

/** Source des graines, injectable pour des tests déterministes. */
export const CRASH_SEED_FACTORY = Symbol('CRASH_SEED_FACTORY');
export const crashSeedFactoryProvider = { provide: CRASH_SEED_FACTORY, useValue: generateSeed };

const NO_EMITTER: CrashEmitter = { toAll: () => undefined, toUser: () => undefined };

/**
 * Boucle de jeu unique, partagée par tous les joueurs :
 * MISES (8 s) → EN VOL → CRASH → PAUSE (3 s) → partie suivante.
 * Le point de crash et la graine restent secrets jusqu'au crash. Les encaissements sont
 * calculés à l'heure du serveur ; les encaissements automatiques sont exécutés par le serveur.
 */
@Injectable()
export class CrashService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CrashService.name);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private emitter: CrashEmitter = NO_EMITTER;
  private round: CrashRound | null = null;
  private roundCounter = 0;
  private history: CrashHistoryEntry[] = [];
  private running = false;

  constructor(
    private readonly walletService: WalletService,
    private readonly bots: CrashBots,
    @Inject(CRASH_SEED_FACTORY) private readonly seedFactory: () => string,
  ) {}

  attach(emitter: CrashEmitter): void {
    this.emitter = emitter;
  }

  onApplicationBootstrap(): void {
    this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startBetting();
  }

  /** Arrête la boucle et rembourse les mises encore en jeu (CDC §4.4). */
  async stop(): Promise<void> {
    this.running = false;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    const round = this.round;
    if (!round || round.phase === 'CRASHED') return;
    for (const bet of round.bets.values()) {
      if (bet.isHouse || bet.cashedOutAt !== null) continue;
      await this.walletService.credit(
        bet.userId,
        bet.amount,
        'CRASH',
        `crash:${round.id}:${bet.userId}:refund`,
      );
    }
  }

  async placeBet(user: AuthUser, amount: number, autoCashOut: number | null) {
    const round = this.round;
    if (!round || round.phase !== 'BETTING' || Date.now() >= round.bettingEndsAt) {
      throw new AppException(
        'CRASH_BETTING_CLOSED',
        'Les mises sont fermées : attendez la prochaine partie.',
        HttpStatus.CONFLICT,
      );
    }
    if (!Number.isInteger(amount) || amount < MIN_BET || amount > MAX_BET) {
      throw new AppException(
        'CRASH_INVALID_BET',
        `La mise doit être un entier entre ${MIN_BET} et ${MAX_BET}.`,
        HttpStatus.BAD_REQUEST,
        { minBet: MIN_BET, maxBet: MAX_BET },
      );
    }
    if (
      autoCashOut !== null &&
      (!Number.isInteger(autoCashOut) ||
        autoCashOut < MIN_AUTO_CASH_OUT ||
        autoCashOut > MAX_MULTIPLIER)
    ) {
      throw new AppException(
        'CRASH_INVALID_AUTO_CASH_OUT',
        'L’encaissement automatique doit être compris entre 1,01× et 1 000×.',
      );
    }
    if (round.bets.has(user.sub)) {
      throw new AppException(
        'CRASH_ALREADY_BET',
        'Vous avez déjà misé sur cette partie.',
        HttpStatus.CONFLICT,
      );
    }

    // La place est réservée avant l'appel au wallet : un double envoi ne peut pas miser deux fois
    const bet: CrashBet = {
      key: randomUUID(),
      userId: user.sub,
      username: user.username,
      amount,
      autoCashOut,
      cashedOutAt: null,
      payout: 0,
      isHouse: false,
    };
    round.bets.set(user.sub, bet);

    try {
      const { newBalance } = await this.walletService.debit(
        user.sub,
        amount,
        'CRASH',
        `crash:${round.id}:${user.sub}:bet`,
      );
      this.emitter.toAll('player:bet', toPublicPlayer(bet));
      // Tous les onglets du joueur voient sa mise et son nouveau solde
      this.emitter.toUser(user.sub, 'my:bet', { amount, autoCashOut, newBalance });
      return { newBalance };
    } catch (error) {
      round.bets.delete(user.sub);
      throw error;
    }
  }

  async cashOut(userId: string) {
    const round = this.round;
    if (!round || round.phase !== 'RUNNING' || round.startedAt === null) {
      throw new AppException(
        'CRASH_NOT_RUNNING',
        'Aucune partie en vol : impossible d’encaisser.',
        HttpStatus.CONFLICT,
      );
    }
    const bet = round.bets.get(userId);
    if (!bet) {
      throw new AppException('CRASH_NO_BET', 'Vous n’avez pas misé sur cette partie.');
    }
    if (bet.cashedOutAt !== null) {
      throw new AppException(
        'CRASH_ALREADY_CASHED_OUT',
        'Mise déjà encaissée.',
        HttpStatus.CONFLICT,
      );
    }

    // Heure du serveur à la réception : le client n'envoie jamais de multiplicateur
    const multiplier = Math.min(multiplierAt(Date.now() - round.startedAt), round.crashPoint);
    const result = await this.settleCashOut(round, bet, multiplier);
    return result!;
  }

  getSnapshot(userId?: string): CrashSnapshot {
    const round = this.round;
    if (!round) {
      throw new AppException('GAME_NOT_FOUND', 'Le jeu démarre, réessayez dans un instant.');
    }
    const crashed = round.phase === 'CRASHED';
    const myBet = userId ? round.bets.get(userId) : undefined;
    return {
      roundId: round.id,
      number: round.number,
      phase: round.phase,
      seedHash: round.seedHash,
      bettingEndsAt: round.bettingEndsAt,
      startedAt: round.startedAt,
      crashPoint: crashed ? round.crashPoint : null,
      seed: crashed ? round.seed : null,
      serverNow: Date.now(),
      players: [...round.bets.values()].map(toPublicPlayer),
      history: this.history,
      myBet: myBet
        ? {
            amount: myBet.amount,
            autoCashOut: myBet.autoCashOut,
            cashedOutAt: myBet.cashedOutAt,
            payout: myBet.payout,
          }
        : null,
      limits: {
        minBet: MIN_BET,
        maxBet: MAX_BET,
        minAutoCashOut: MIN_AUTO_CASH_OUT,
        maxMultiplier: MAX_MULTIPLIER,
      },
    };
  }

  // --- Boucle de jeu --------------------------------------------------------------------------

  private startBetting(): void {
    const number = ++this.roundCounter;
    const seed = this.seedFactory();
    const round: CrashRound = {
      id: randomUUID(),
      number,
      phase: 'BETTING',
      seed,
      seedHash: hashSeed(seed),
      crashPoint: crashPointForRound(seed, number),
      bettingEndsAt: Date.now() + BETTING_MS,
      startedAt: null,
      crashedAt: null,
      bets: new Map(),
    };
    this.round = round;

    this.emitter.toAll('round:betting', {
      roundId: round.id,
      number,
      seedHash: round.seedHash,
      bettingEndsAt: round.bettingEndsAt,
      serverNow: Date.now(),
    });

    for (const plan of this.bots.planRound(BETTING_MS)) {
      this.schedule(() => this.placeHouseBet(round, plan), plan.delayMs);
    }
    this.schedule(() => this.startRunning(round), BETTING_MS);
  }

  private placeHouseBet(round: CrashRound, plan: HouseBetPlan): void {
    if (round !== this.round || round.phase !== 'BETTING') return;
    const bet: CrashBet = {
      key: randomUUID(),
      userId: `house:${plan.username}`,
      username: plan.username,
      amount: plan.amount,
      autoCashOut: plan.autoCashOut,
      cashedOutAt: null,
      payout: 0,
      isHouse: true,
    };
    round.bets.set(bet.userId, bet);
    this.emitter.toAll('player:bet', toPublicPlayer(bet));
  }

  private startRunning(round: CrashRound): void {
    round.phase = 'RUNNING';
    round.startedAt = Date.now();
    this.emitter.toAll('round:started', {
      roundId: round.id,
      startedAt: round.startedAt,
      serverNow: Date.now(),
    });

    // Encaissements automatiques programmés AVANT le crash : à égalité de délai, l'encaissement
    // passe en premier (le multiplicateur visé a bien été atteint)
    for (const bet of round.bets.values()) {
      const target = bet.autoCashOut;
      if (target !== null && target <= round.crashPoint) {
        this.schedule(() => void this.settleCashOut(round, bet, target), timeToReach(target));
      }
    }
    this.schedule(() => this.crash(round), timeToReach(round.crashPoint));
  }

  private crash(round: CrashRound): void {
    round.phase = 'CRASHED';
    round.crashedAt = Date.now();
    const entry: CrashHistoryEntry = {
      number: round.number,
      crashPoint: round.crashPoint,
      seedHash: round.seedHash,
      seed: round.seed,
    };
    this.history = [entry, ...this.history].slice(0, HISTORY_SIZE);

    this.emitter.toAll('round:crashed', {
      roundId: round.id,
      ...entry,
      serverNow: Date.now(),
    });
    this.schedule(() => this.startBetting(), PAUSE_MS);
  }

  private async settleCashOut(round: CrashRound, bet: CrashBet, multiplier: number) {
    if (round.phase !== 'RUNNING' || bet.cashedOutAt !== null) return null;

    // Marqué avant tout await : un second encaissement simultané est impossible
    bet.cashedOutAt = multiplier;
    bet.payout = payoutFor(bet.amount, multiplier);
    this.emitter.toAll('player:cashout', {
      key: bet.key,
      cashedOutAt: multiplier,
      payout: bet.payout,
    });

    if (bet.isHouse) return null;

    const { newBalance } = await this.walletService.credit(
      bet.userId,
      bet.payout,
      'CRASH',
      `crash:${round.id}:${bet.userId}:cashout`,
    );
    const result = { newBalance, cashedOutAt: multiplier, payout: bet.payout };
    this.emitter.toUser(bet.userId, 'my:cashout', result);
    return result;
  }

  private schedule(task: () => void, delayMs: number): void {
    if (!this.running) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (!this.running) return;
      try {
        task();
      } catch (error) {
        this.logger.error(error);
      }
    }, delayMs);
    this.timers.add(timer);
  }
}

function toPublicPlayer(bet: CrashBet): PublicPlayer {
  return {
    key: bet.key,
    username: bet.username,
    amount: bet.amount,
    cashedOutAt: bet.cashedOutAt,
    payout: bet.payout,
  };
}
