// Même mathématiques que le serveur (backend/src/modules/crash/engine/crash.math.ts)

export const GROWTH_PER_MS = 0.00006;
export const MAX_MULTIPLIER = 100_000;
export const HOUSE_EDGE = 0.01;

export function multiplierAt(elapsedMs: number): number {
  if (elapsedMs <= 0) return 100;
  return Math.min(MAX_MULTIPLIER, Math.floor(100 * Math.exp(GROWTH_PER_MS * elapsedMs)));
}

export function timeToReach(multiplier: number): number {
  if (multiplier <= 100) return 0;
  return Math.ceil(Math.log(multiplier / 100) / GROWTH_PER_MS);
}

export function payoutFor(amount: number, multiplier: number): number {
  return Math.floor((amount * multiplier) / 100);
}

/** 234 → « 2,34× » */
export function formatMultiplier(multiplier: number): string {
  return `${(multiplier / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}×`;
}

/** Classe de couleur d'un crash dans l'historique : rouge < 2×, vert ≥ 2×, or ≥ 10×. */
export function crashColorClass(multiplier: number): string {
  if (multiplier >= 1000) return 'text-primary';
  if (multiplier >= 200) return 'text-success';
  return 'text-error';
}

function crashPointFromHash(hashHex: string): number {
  const r = parseInt(hashHex.slice(0, 13), 16) / 2 ** 52;
  const crash = Math.floor((100 * (1 - HOUSE_EDGE)) / (1 - r));
  return Math.min(MAX_MULTIPLIER, Math.max(100, crash));
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vérification provably fair, entièrement dans le navigateur (WebCrypto) :
 * SHA-256(graine) doit correspondre au hash publié AVANT la partie, et
 * HMAC-SHA256(graine, numéro de partie) doit redonner le point de crash annoncé.
 */
export async function verifyRound(entry: { seed: string; seedHash: string; number: number }) {
  const encoder = new TextEncoder();
  const hash = toHex(await crypto.subtle.digest('SHA-256', encoder.encode(entry.seed)));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(entry.seed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const gameHash = toHex(
    await crypto.subtle.sign('HMAC', key, encoder.encode(String(entry.number))),
  );
  return {
    hashMatches: hash === entry.seedHash,
    crashPoint: crashPointFromHash(gameHash),
  };
}
