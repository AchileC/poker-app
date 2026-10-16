import type { Card } from './types';

/** Total d'une main (As = 1 ou 11), calculé côté client sur les cartes visibles uniquement. */
export function handValue(cards: (Card | null)[]): { total: number; soft: boolean } {
  const visible = cards.filter((card): card is Card => card !== null);
  const hard = visible.reduce((sum, card) => {
    if (card.rank === 'A') return sum + 1;
    if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return sum + 10;
    return sum + Number(card.rank);
  }, 0);
  const hasAce = visible.some((card) => card.rank === 'A');
  return hasAce && hard + 10 <= 21
    ? { total: hard + 10, soft: true }
    : { total: hard, soft: false };
}

/** Couleur du jeton le plus proche (standard casino) pour représenter un montant. */
export function chipColorClass(amount: number): string {
  if (amount >= 500) return 'bg-chip-500';
  if (amount >= 100) return 'bg-chip-100';
  if (amount >= 25) return 'bg-chip-25';
  return 'bg-chip-5';
}
