import { cryptoShuffle, secureRandomInt } from './csprng.util';

describe('csprng.util', () => {
  it('secureRandomInt reste dans [min, max[', () => {
    for (let i = 0; i < 1000; i++) {
      const value = secureRandomInt(0, 37);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(37);
    }
  });

  it('cryptoShuffle renvoie une permutation sans modifier l’original', () => {
    const deck = Array.from({ length: 52 }, (_, i) => i);
    const shuffled = cryptoShuffle(deck);

    expect(shuffled).toHaveLength(52);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(deck);
    expect(deck).toEqual(Array.from({ length: 52 }, (_, i) => i));
  });
});
