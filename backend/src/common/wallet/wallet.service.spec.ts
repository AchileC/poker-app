import { AppException, InsufficientFundsException } from '../errors/app.exception';
import { DEFAULT_BALANCE, WalletService } from './wallet.service';

describe('WalletService', () => {
  let wallet: WalletService;

  beforeEach(() => {
    wallet = new WalletService();
  });

  it('crée un solde par défaut pour un nouveau joueur', async () => {
    await expect(wallet.getBalance('alice')).resolves.toBe(DEFAULT_BALANCE);
  });

  it('débite puis crédite le solde', async () => {
    await expect(wallet.debit('alice', 300, 'ROULETTE', 'spin-1')).resolves.toMatchObject({
      newBalance: 700,
    });
    await expect(wallet.credit('alice', 50, 'ROULETTE', 'spin-1')).resolves.toMatchObject({
      newBalance: 750,
    });
    await expect(wallet.getHistory('alice')).resolves.toHaveLength(2);
  });

  it('refuse un débit supérieur au solde avec INSUFFICIENT_FUNDS', async () => {
    const debit = wallet.debit('alice', DEFAULT_BALANCE + 1, 'POKER', 'buyin-1');
    await expect(debit).rejects.toBeInstanceOf(InsufficientFundsException);
    await expect(debit).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    await expect(wallet.getBalance('alice')).resolves.toBe(DEFAULT_BALANCE);
  });

  it.each([0, -10, 10.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuse le montant invalide %p',
    async (amount) => {
      await expect(wallet.debit('alice', amount, 'BLACKJACK', 'hand-1')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    },
  );

  it("est idempotent : rejouer le même referenceId ne débite qu'une fois", async () => {
    const first = await wallet.debit('alice', 200, 'BLACKJACK', 'hand-1:bet');
    const replay = await wallet.debit('alice', 200, 'BLACKJACK', 'hand-1:bet');

    expect(replay.transaction.id).toBe(first.transaction.id);
    await expect(wallet.getBalance('alice')).resolves.toBe(DEFAULT_BALANCE - 200);
    await expect(wallet.getHistory('alice')).resolves.toHaveLength(1);
  });

  it('refuse la réutilisation d’un referenceId pour une autre opération', async () => {
    await wallet.debit('alice', 200, 'BLACKJACK', 'hand-1:bet');
    await expect(wallet.debit('alice', 300, 'BLACKJACK', 'hand-1:bet')).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(wallet.debit('bob', 200, 'BLACKJACK', 'hand-1:bet')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('traite des débits concurrents sans double dépense', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) => wallet.debit('alice', 400, 'POKER', `buyin-${i}`)),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    await expect(wallet.getBalance('alice')).resolves.toBe(DEFAULT_BALANCE - 800);
  });
});
