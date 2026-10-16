import { WalletService } from '../../common/wallet/wallet.service';
import { BlackjackService } from './blackjack.service';
import { BlackjackRoundStore } from './blackjack.store';
import { Card, Rank, Suit } from './engine/blackjack.types';

function cards(...codes: string[]): Card[] {
  return codes.map((code) => ({ rank: code.slice(0, -1) as Rank, suit: code.slice(-1) as Suit }));
}

describe('BlackjackService', () => {
  let wallet: WalletService;
  let service: BlackjackService;
  let nextShoe: Card[];

  beforeEach(() => {
    wallet = new WalletService();
    nextShoe = [];
    service = new BlackjackService(wallet, new BlackjackRoundStore(), () => [...nextShoe]);
  });

  function withShoe(...codes: string[]) {
    nextShoe = cards(...codes);
  }

  async function refs(userId: string) {
    return (await wallet.getHistory(userId)).map(
      (tx) => `${tx.type}:${tx.amount}:${tx.referenceId}`,
    );
  }

  it('débite la mise et ne renvoie jamais la carte cachée', async () => {
    withShoe('KS', '9H', '7D', 'AC');
    const { round, newBalance } = await service.startRound('alice', 'VEGAS', 100);

    expect(newBalance).toBe(900);
    expect(round!.dealer.cards).toEqual([{ rank: '9', suit: 'H' }, null]);
    expect(round!.version).toBe(0);
    expect(JSON.stringify(round)).not.toContain('shoe');
  });

  it.each([5, 501, 10.5])('refuse la mise %p sans débiter', async (bet) => {
    await expect(service.startRound('alice', 'VEGAS', bet)).rejects.toMatchObject({
      code: 'BLACKJACK_INVALID_BET',
    });
    await expect(wallet.getBalance('alice')).resolves.toBe(1000);
  });

  it('refuse une 2e partie tant que la première est en cours', async () => {
    withShoe('KS', '9H', '7D', '8C');
    await service.startRound('alice', 'VEGAS', 100);
    await expect(service.startRound('alice', 'VEGAS', 100)).rejects.toMatchObject({
      code: 'BLACKJACK_ROUND_IN_PROGRESS',
    });
  });

  it('double puis règle la partie avec un seul crédit', async () => {
    withShoe('6S', '6H', '5D', 'KC', 'KS', 'KH');
    const { round } = await service.startRound('alice', 'VEGAS', 100);
    const result = await service.act('alice', round!.id, 'DOUBLE', round!.version);

    expect(result.round!.phase).toBe('SETTLED');
    expect(result.round!.totalPayout).toBe(400);
    expect(result.newBalance).toBe(1200);
    expect(await refs('alice')).toEqual([
      `DEBIT:100:blackjack:${round!.id}:h0:bet`,
      `DEBIT:100:blackjack:${round!.id}:h0:double`,
      `CREDIT:400:blackjack:${round!.id}:payout`,
    ]);

    // partie terminée : plus de partie courante, on peut rejouer
    await expect(service.getCurrent('alice')).resolves.toMatchObject({ round: null });
  });

  it('débite chaque nouvelle main de split et l’assurance', async () => {
    withShoe('8S', 'AH', '8D', '7C', '3S', '2H', 'KS', 'QS', 'KD');
    const { round } = await service.startRound('alice', 'VEGAS', 100);
    let state = (await service.act('alice', round!.id, 'INSURANCE', 0)).round!;
    state = (await service.act('alice', state.id, 'SPLIT', state.version)).round!;

    expect(state.hands).toHaveLength(2);
    expect(await refs('alice')).toEqual([
      `DEBIT:100:blackjack:${round!.id}:h0:bet`,
      `DEBIT:50:blackjack:${round!.id}:insurance`,
      `DEBIT:100:blackjack:${round!.id}:h1:bet`,
    ]);
  });

  it('règle immédiatement un blackjack à la distribution', async () => {
    withShoe('AS', '9H', 'KD', '8C');
    const { round, newBalance } = await service.startRound('alice', 'VEGAS', 100);
    expect(round!.phase).toBe('SETTLED');
    expect(newBalance).toBe(1150);
  });

  it('refuse une action avec une version périmée', async () => {
    withShoe('KS', '9H', '2D', '8C', '2S', '2H');
    const { round } = await service.startRound('alice', 'VEGAS', 100);
    await service.act('alice', round!.id, 'HIT', 0);
    await expect(service.act('alice', round!.id, 'HIT', 0)).rejects.toMatchObject({
      code: 'BLACKJACK_STALE_STATE',
    });
  });

  it('refuse les doubles-clics concurrents', async () => {
    withShoe('KS', '9H', '2D', '8C', '2S', '2H');
    const { round } = await service.startRound('alice', 'VEGAS', 100);
    const results = await Promise.allSettled([
      service.act('alice', round!.id, 'HIT', 0),
      service.act('alice', round!.id, 'HIT', 0),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('ne laisse pas un autre joueur agir sur la partie', async () => {
    withShoe('KS', '9H', '7D', '8C');
    const { round } = await service.startRound('alice', 'VEGAS', 100);
    await expect(service.act('bob', round!.id, 'STAND', 0)).rejects.toMatchObject({
      code: 'GAME_NOT_FOUND',
    });
  });

  it('refuse une action interdite par la table', async () => {
    withShoe('KS', '9H', '7D');
    const { round } = await service.startRound('alice', 'EUROPE', 100);
    await expect(service.act('alice', round!.id, 'SURRENDER', 0)).rejects.toMatchObject({
      code: 'INVALID_ACTION',
    });
  });

  it('solde insuffisant pour doubler : la partie ne bouge pas', async () => {
    withShoe('6S', '6H', '5D', 'KC', 'KS', 'KH');
    await wallet.debit('alice', 850, 'SHOP', 'drain');
    const { round } = await service.startRound('alice', 'VEGAS', 100);

    await expect(service.act('alice', round!.id, 'DOUBLE', 0)).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
    });
    const current = await service.getCurrent('alice');
    expect(current.round!.version).toBe(0);
    expect(current.round!.hands[0]!.bet).toBe(100);
  });
});
