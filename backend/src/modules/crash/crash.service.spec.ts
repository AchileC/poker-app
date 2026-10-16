import { WalletService } from '../../common/wallet/wallet.service';
import { CrashBots, HouseBetPlan } from './crash.bots';
import { BETTING_MS, CrashService, PAUSE_MS } from './crash.service';
import { CrashEmitter } from './crash.types';
import { crashPointForRound, generateSeed, hashSeed, timeToReach } from './engine/crash.math';

const ALICE = { sub: 'alice', username: 'Alice' };
const BOB = { sub: 'bob', username: 'Bob' };

/** Graine dont le crash de la partie n°1 tombe dans [min, max] (centièmes). */
function seedCrashingBetween(min: number, max: number): string {
  for (;;) {
    const seed = generateSeed();
    const crash = crashPointForRound(seed, 1);
    if (crash >= min && crash <= max) return seed;
  }
}

describe('CrashService', () => {
  let wallet: WalletService;
  let service: CrashService;
  let houseBets: HouseBetPlan[];
  let events: { to: string; event: string; payload: unknown }[];
  let seed: string;

  function createService() {
    const bots = { planRound: () => houseBets } as unknown as CrashBots;
    service = new CrashService(wallet, bots, () => seed);
    const emitter: CrashEmitter = {
      toAll: (event, payload) => events.push({ to: 'all', event, payload }),
      toUser: (userId, event, payload) => events.push({ to: userId, event, payload }),
    };
    service.attach(emitter);
  }

  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000_000 });
    wallet = new WalletService();
    houseBets = [];
    events = [];
    seed = seedCrashingBetween(300, 500);
    createService();
  });

  afterEach(async () => {
    await service.stop();
    jest.useRealTimers();
  });

  async function flush() {
    // laisse les promesses (wallet) se résoudre entre deux avancées d'horloge
    await Promise.resolve();
    await Promise.resolve();
  }

  it('débite la mise puis paie l’encaissement calculé à l’heure du serveur', async () => {
    service.start();
    await expect(service.placeBet(ALICE, 100, null)).resolves.toEqual({ newBalance: 900 });
    expect(events).toContainEqual({
      to: 'alice',
      event: 'my:bet',
      payload: { amount: 100, autoCashOut: null, newBalance: 900 },
    });

    jest.advanceTimersByTime(BETTING_MS + timeToReach(150));
    const result = await service.cashOut('alice');

    expect(result.cashedOutAt).toBe(150);
    expect(result.payout).toBe(150);
    expect(result.newBalance).toBe(1050);
    const history = (await wallet.getHistory('alice')).map((tx) => tx.referenceId);
    expect(history).toEqual([
      expect.stringMatching(/^crash:.+:alice:bet$/),
      expect.stringMatching(/^crash:.+:alice:cashout$/),
    ]);
  });

  it('refuse un encaissement après le crash et un double encaissement', async () => {
    service.start();
    await service.placeBet(ALICE, 100, null);
    await service.placeBet(BOB, 100, null);

    jest.advanceTimersByTime(BETTING_MS + 1000);
    await service.cashOut('bob');
    await expect(service.cashOut('bob')).rejects.toMatchObject({
      code: 'CRASH_ALREADY_CASHED_OUT',
    });

    jest.advanceTimersByTime(timeToReach(500));
    await expect(service.cashOut('alice')).rejects.toMatchObject({ code: 'CRASH_NOT_RUNNING' });
    await expect(wallet.getBalance('alice')).resolves.toBe(900);
  });

  it('exécute l’encaissement automatique au multiplicateur exact', async () => {
    service.start();
    await service.placeBet(ALICE, 100, 200);

    jest.advanceTimersByTime(BETTING_MS + timeToReach(200));
    await flush();

    await expect(wallet.getBalance('alice')).resolves.toBe(1100);
    expect(events).toContainEqual({
      to: 'alice',
      event: 'my:cashout',
      payload: { newBalance: 1100, cashedOutAt: 200, payout: 200 },
    });
  });

  it('un encaissement automatique au-dessus du crash est perdu', async () => {
    service.start();
    await service.placeBet(ALICE, 100, 900);
    jest.advanceTimersByTime(BETTING_MS + timeToReach(900));
    await flush();
    await expect(wallet.getBalance('alice')).resolves.toBe(900);
  });

  it('crash immédiat à 1,00× : la mise est perdue', async () => {
    seed = seedCrashingBetween(100, 100);
    createService();
    service.start();
    await service.placeBet(ALICE, 100, 101);

    jest.advanceTimersByTime(BETTING_MS + 1); // Node arrondit setTimeout(0) à 1 ms
    await flush();
    expect(service.getSnapshot().phase).toBe('CRASHED');
    await expect(wallet.getBalance('alice')).resolves.toBe(900);
  });

  it('valide les mises', async () => {
    service.start();
    await expect(service.placeBet(ALICE, 5, null)).rejects.toMatchObject({
      code: 'CRASH_INVALID_BET',
    });
    await expect(service.placeBet(ALICE, 100, 100)).rejects.toMatchObject({
      code: 'CRASH_INVALID_AUTO_CASH_OUT',
    });
    await service.placeBet(ALICE, 100, null);
    await expect(service.placeBet(ALICE, 100, null)).rejects.toMatchObject({
      code: 'CRASH_ALREADY_BET',
    });

    jest.advanceTimersByTime(BETTING_MS);
    await expect(service.placeBet(BOB, 100, null)).rejects.toMatchObject({
      code: 'CRASH_BETTING_CLOSED',
    });
  });

  it('refuse deux mises simultanées du même joueur', async () => {
    service.start();
    const results = await Promise.allSettled([
      service.placeBet(ALICE, 100, null),
      service.placeBet(ALICE, 100, null),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await expect(wallet.getBalance('alice')).resolves.toBe(900);
  });

  it('garde le crash et la graine secrets jusqu’au crash, puis les révèle', async () => {
    service.start();
    const during = service.getSnapshot();
    expect(during.crashPoint).toBeNull();
    expect(during.seed).toBeNull();
    expect(JSON.stringify(during)).not.toContain(seed);
    expect(during.seedHash).toBe(hashSeed(seed));

    jest.advanceTimersByTime(BETTING_MS + timeToReach(crashPointForRound(seed, 1)) + 1);
    const after = service.getSnapshot();
    expect(after.phase).toBe('CRASHED');
    expect(after.seed).toBe(seed);
    expect(after.crashPoint).toBe(crashPointForRound(seed, 1));
    expect(after.history[0]).toMatchObject({ number: 1, seed, seedHash: hashSeed(seed) });

    jest.advanceTimersByTime(PAUSE_MS);
    expect(service.getSnapshot()).toMatchObject({ phase: 'BETTING', number: 2 });
  });

  it('les joueurs de la maison ne touchent pas au wallet et ne sont pas identifiables', async () => {
    houseBets = [{ username: 'Lucas_93', delayMs: 500, amount: 250, autoCashOut: 150 }];
    service.start();
    jest.advanceTimersByTime(600);

    const snapshot = service.getSnapshot();
    expect(snapshot.players).toEqual([
      { key: expect.any(String), username: 'Lucas_93', amount: 250, cashedOutAt: null, payout: 0 },
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(/house/i);

    jest.advanceTimersByTime(BETTING_MS + timeToReach(150));
    await flush();
    expect(service.getSnapshot().players[0]).toMatchObject({ cashedOutAt: 150, payout: 375 });
    await expect(wallet.getHistory('house:Lucas_93')).resolves.toEqual([]);
  });

  it('rembourse les mises en jeu à l’arrêt du serveur', async () => {
    service.start();
    await service.placeBet(ALICE, 100, null);
    jest.advanceTimersByTime(BETTING_MS + 500);

    await service.stop();
    await expect(wallet.getBalance('alice')).resolves.toBe(1000);
  });
});
