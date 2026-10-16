import { createHmac } from 'node:crypto';
import {
  MAX_MULTIPLIER,
  crashPointForRound,
  crashPointFromHash,
  generateSeed,
  hashSeed,
  multiplierAt,
  payoutFor,
  timeToReach,
} from './crash.math';

describe('courbe', () => {
  it('part de 1,00× et atteint 2× vers 11,5 s', () => {
    expect(multiplierAt(0)).toBe(100);
    expect(multiplierAt(11_552)).toBe(199);
    expect(multiplierAt(11_553)).toBe(200);
    expect(multiplierAt(38_377)).toBeGreaterThanOrEqual(1000);
  });

  it('timeToReach est l’inverse de multiplierAt', () => {
    for (const m of [101, 150, 200, 1234, 10_000]) {
      expect(multiplierAt(timeToReach(m))).toBeGreaterThanOrEqual(m);
      expect(multiplierAt(timeToReach(m) - 2)).toBeLessThan(m);
    }
  });

  it('est plafonnée à 1 000×', () => {
    expect(multiplierAt(10_000_000)).toBe(MAX_MULTIPLIER);
  });
});

describe('gains', () => {
  it('arrondit à l’entier inférieur', () => {
    expect(payoutFor(100, 250)).toBe(250);
    expect(payoutFor(15, 133)).toBe(19); // 19,95
  });
});

describe('point de crash', () => {
  // Tout tirage brut < 1,01 est tronqué à 1,00 : ~2 % de crashs immédiats (1 − 0,99/1,01)
  it('vaut 1,00× pour r = 0', () => {
    expect(crashPointFromHash('0000000000000' + 'f'.repeat(51))).toBe(100);
  });

  it('suit la loi P(crash ≥ x) = 0,99 / x (espérance d’un encaissement : 0,99)', () => {
    const samples = 100_000;
    let atLeast2 = 0;
    let atLeast10 = 0;
    let instant = 0;
    for (let i = 0; i < samples; i++) {
      const crash = crashPointForRound(generateSeed(), i);
      if (crash >= 200) atLeast2++;
      if (crash >= 1000) atLeast10++;
      if (crash === 100) instant++;
    }
    expect(atLeast2 / samples).toBeCloseTo(0.495, 1);
    expect(atLeast10 / samples).toBeCloseTo(0.099, 1);
    expect(instant / samples).toBeCloseTo(0.0198, 2);
  });
});

describe('provably fair', () => {
  it('le crash se recalcule à partir de la graine révélée', () => {
    const seed = generateSeed();
    const seedHash = hashSeed(seed);
    const gameHash = createHmac('sha256', seed).update('42').digest('hex');

    expect(seedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSeed(seed)).toBe(seedHash);
    expect(crashPointForRound(seed, 42)).toBe(crashPointFromHash(gameHash));
  });
});
