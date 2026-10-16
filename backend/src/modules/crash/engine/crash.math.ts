import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * Mathématiques du Crash, sans dépendance Nest.
 * Les multiplicateurs sont manipulés en CENTIÈMES entiers (250 = 2,50×) pour éviter
 * toute erreur d'arrondi sur les gains.
 */

/** Croissance de la courbe : m(t) = e^(GROWTH × ms). 2× en ~11,5 s, 10× en ~38 s. */
export const GROWTH_PER_MS = 0.00006;
/** Plafond du multiplicateur : 1 000×. */
export const MAX_MULTIPLIER = 100_000;
/** Marge de la maison : 1 %. */
export const HOUSE_EDGE = 0.01;

/** Multiplicateur (centièmes) atteint après `elapsedMs` de vol, tronqué. */
export function multiplierAt(elapsedMs: number): number {
  if (elapsedMs <= 0) return 100;
  return Math.min(MAX_MULTIPLIER, Math.floor(100 * Math.exp(GROWTH_PER_MS * elapsedMs)));
}

/** Temps de vol (ms) nécessaire pour atteindre un multiplicateur (centièmes). */
export function timeToReach(multiplier: number): number {
  if (multiplier <= 100) return 0;
  return Math.ceil(Math.log(multiplier / 100) / GROWTH_PER_MS);
}

/** Gain d'une mise encaissée à `multiplier` (centièmes), arrondi à l'entier inférieur. */
export function payoutFor(amount: number, multiplier: number): number {
  return Math.floor((amount * multiplier) / 100);
}

/**
 * Point de crash à partir d'un hash hexadécimal.
 * r = 52 premiers bits / 2^52 ∈ [0, 1) ; crash = (1 − marge) / (1 − r), tronqué au centième.
 * Ainsi P(crash ≥ x) = (1 − marge) / x : la marge est garantie sur le long terme.
 */
export function crashPointFromHash(hashHex: string, houseEdge = HOUSE_EDGE): number {
  const r = parseInt(hashHex.slice(0, 13), 16) / 2 ** 52;
  const crash = Math.floor((100 * (1 - houseEdge)) / (1 - r));
  return Math.min(MAX_MULTIPLIER, Math.max(100, crash));
}

// --- Provably fair ---------------------------------------------------------------------------
// Avant la partie : on publie `seedHash = SHA-256(seed)`.
// Après le crash : on révèle `seed`. Chacun peut vérifier que SHA-256(seed) = seedHash
// et recalculer le crash : crashPointFromHash(HMAC-SHA256(clé = seed, message = numéro de partie)).

export function generateSeed(): string {
  return randomBytes(32).toString('hex');
}

export function hashSeed(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

export function crashPointForRound(seed: string, roundNumber: number): number {
  const gameHash = createHmac('sha256', seed).update(String(roundNumber)).digest('hex');
  return crashPointFromHash(gameHash);
}
