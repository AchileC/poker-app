import { randomInt } from 'node:crypto';

/**
 * Règle de Sécurité Section 5.2 :
 * Génération Aléatoire Cryptographique (CSPRNG) obligatoire pour tous les jeux.
 * Math.random() est proscrit côté serveur.
 */
export function secureRandomInt(minInclusive: number, maxExclusive: number): number {
  return randomInt(minInclusive, maxExclusive);
}

/**
 * Mélange de Fisher-Yates cryptographiquement sûr (CSPRNG) pour les paquets de cartes.
 */
export function cryptoShuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
}
