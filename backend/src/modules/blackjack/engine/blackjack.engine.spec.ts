import {
  IllegalActionError,
  applyAction,
  availableActions,
  createShoe,
  dealRound,
  handValue,
  totalPayout,
} from './blackjack.engine';
import { TABLE_RULES } from './blackjack.rules';
import { BlackjackAction, Card, Rank, Round, Suit, TableType } from './blackjack.types';
import { toRoundView } from './blackjack.view';

/** 'AS' = As de pique, '10H' = 10 de cœur... */
function card(code: string): Card {
  return { rank: code.slice(0, -1) as Rank, suit: code.slice(-1) as Suit };
}

function cards(...codes: string[]): Card[] {
  return codes.map(card);
}

/**
 * Sabot dans l'ordre de distribution.
 * Vegas : joueur, croupier visible, joueur, croupier caché, puis tirages.
 * Europe : joueur, croupier visible, joueur, puis tirages (2e carte croupier après le joueur).
 */
function deal(table: TableType, bet: number, ...codes: string[]): Round {
  return dealRound('round-1', TABLE_RULES[table], bet, cards(...codes));
}

function play(round: Round, ...actions: BlackjackAction[]): Round {
  return actions.reduce(applyAction, round);
}

describe('handValue', () => {
  it.each([
    [['AS', 'KH'], 21, true],
    [['AS', '6H'], 17, true],
    [['AS', 'AH', '9D'], 21, true],
    [['AS', '6H', 'KD'], 17, false],
    [['KS', 'QH', '5D'], 25, false],
    [['5S', '4H'], 9, false],
  ])('%p vaut %p (soft: %p)', (codes, total, soft) => {
    expect(handValue(cards(...codes))).toEqual({ total, soft });
  });
});

describe('createShoe', () => {
  it('contient 6 paquets complets', () => {
    const shoe = createShoe(6);
    expect(shoe).toHaveLength(312);
    const aceOfSpades = shoe.filter((c) => c.rank === 'A' && c.suit === 'S');
    expect(aceOfSpades).toHaveLength(6);
  });
});

describe('Table Vegas', () => {
  it('distribue 2 cartes au joueur et au croupier (dont une cachée)', () => {
    const round = deal('VEGAS', 100, 'KS', '9H', '7D', '8C');
    expect(round.phase).toBe('PLAYER_TURN');
    expect(round.hands[0]!.cards).toEqual(cards('KS', '7D'));
    expect(round.dealer).toEqual(cards('9H', '8C'));
    expect(availableActions(round)).toEqual(['HIT', 'STAND', 'DOUBLE', 'SURRENDER']);
  });

  it('paie un blackjack 3:2 avec arrondi inférieur', () => {
    const round = deal('VEGAS', 15, 'AS', '9H', 'KD', '8C');
    expect(round.phase).toBe('SETTLED');
    expect(round.hands[0]!.result).toBe('BLACKJACK');
    expect(totalPayout(round)).toBe(15 + 22);
  });

  it('vérifie le blackjack du croupier avant le tour du joueur', () => {
    const round = deal('VEGAS', 100, 'KS', 'KH', '7D', 'AC');
    expect(round.phase).toBe('SETTLED');
    expect(round.hands[0]!.result).toBe('LOSE');
    expect(totalPayout(round)).toBe(0);
  });

  it('égalité si joueur et croupier ont tous les deux blackjack', () => {
    const round = deal('VEGAS', 100, 'AS', 'KH', 'QD', 'AC');
    expect(round.hands[0]!.result).toBe('PUSH');
    expect(totalPayout(round)).toBe(100);
  });

  it('le croupier reste sur soft 17', () => {
    const round = play(deal('VEGAS', 100, 'KS', '6H', '8D', 'AC'), 'STAND');
    expect(round.dealer).toHaveLength(2);
    expect(round.hands[0]!.result).toBe('WIN');
    expect(totalPayout(round)).toBe(200);
  });

  it('le croupier tire jusqu’à 17 et peut sauter', () => {
    const round = play(deal('VEGAS', 100, 'KS', '6H', '7D', '9C', '5S', 'KH'), 'STAND');
    // croupier : 6 + 9 = 15, tire 5 → 20 ; le K suivant reste dans le sabot
    expect(round.dealer).toEqual(cards('6H', '9C', '5S'));
    expect(round.hands[0]!.result).toBe('LOSE');
  });

  it('un joueur qui saute perd sans que le croupier ne tire', () => {
    const round = play(deal('VEGAS', 100, 'KS', '6H', '7D', '9C', 'QS'), 'HIT');
    expect(round.phase).toBe('SETTLED');
    expect(round.hands[0]!.status).toBe('BUST');
    expect(round.dealer).toHaveLength(2);
    expect(totalPayout(round)).toBe(0);
  });

  it('s’arrête automatiquement à 21', () => {
    const round = play(deal('VEGAS', 100, '5S', '6H', '6D', 'KC', 'KS', 'KH'), 'HIT');
    expect(round.hands[0]!.status).toBe('STOOD');
    expect(round.hands[0]!.result).toBe('WIN');
  });

  it('double : mise doublée, une seule carte', () => {
    const round = play(deal('VEGAS', 100, '6S', '6H', '5D', 'KC', 'KS', 'KH'), 'DOUBLE');
    expect(round.hands[0]!.bet).toBe(200);
    expect(round.hands[0]!.cards).toHaveLength(3);
    expect(round.hands[0]!.result).toBe('WIN');
    expect(totalPayout(round)).toBe(400);
  });

  it('abandon tardif : rend la moitié de la mise (arrondie)', () => {
    const round = play(deal('VEGAS', 15, 'KS', 'KH', '6D', '9C'), 'SURRENDER');
    expect(round.hands[0]!.result).toBe('SURRENDER');
    expect(totalPayout(round)).toBe(7);
  });

  it('assurance : paie 2:1 si le croupier a blackjack', () => {
    let round = deal('VEGAS', 100, 'KS', 'AH', '9D', 'KC');
    expect(round.phase).toBe('INSURANCE');
    expect(availableActions(round)).toEqual(['INSURANCE', 'NO_INSURANCE']);

    round = play(round, 'INSURANCE');
    expect(round.phase).toBe('SETTLED');
    expect(round.insurance).toEqual({ bet: 50, payout: 150 });
    expect(round.hands[0]!.result).toBe('LOSE');
    expect(totalPayout(round)).toBe(150);
  });

  it('assurance perdue si le croupier n’a pas blackjack, la partie continue', () => {
    const round = play(deal('VEGAS', 100, 'KS', 'AH', '9D', '7C'), 'INSURANCE');
    expect(round.phase).toBe('PLAYER_TURN');
    const settled = play(round, 'STAND');
    expect(settled.insurance).toEqual({ bet: 50, payout: 0 });
    expect(settled.hands[0]!.result).toBe('WIN');
    expect(totalPayout(settled)).toBe(200);
  });

  it('even money : blackjack face à un As payé 1:1 immédiatement', () => {
    let round = deal('VEGAS', 100, 'AS', 'AH', 'KD', 'KC');
    expect(availableActions(round)).toEqual(['EVEN_MONEY', 'NO_INSURANCE']);
    round = play(round, 'EVEN_MONEY');
    expect(round.hands[0]!.result).toBe('EVEN_MONEY');
    expect(totalPayout(round)).toBe(200);
  });

  it('split : deux mains jouées l’une après l’autre, 21 après split payé 1:1', () => {
    let round = deal('VEGAS', 100, '8S', '6H', '8D', 'KC', '3S', 'AH', 'KS', 'KD');
    expect(availableActions(round)).toContain('SPLIT');

    round = play(round, 'SPLIT');
    expect(round.hands.map((h) => h.cards)).toEqual([cards('8S', '3S'), cards('8D', 'AH')]);
    expect(round.activeHandIndex).toBe(0);
    expect(availableActions(round)).toContain('DOUBLE'); // double après split

    round = play(round, 'HIT', 'STAND'); // 8+3+K = 21 → arrêt auto, puis main 2 : 19
    expect(round.phase).toBe('SETTLED');
    expect(round.hands.map((h) => h.result)).toEqual(['WIN', 'WIN']);
    expect(round.hands[0]!.payout).toBe(200);
  });

  it('split d’As : une seule carte par main, A + K = 21 payé 1:1', () => {
    const round = play(deal('VEGAS', 100, 'AS', '9H', 'AD', '8C', 'KS', '5H'), 'SPLIT');
    expect(round.phase).toBe('SETTLED');
    expect(round.hands.map((h) => h.status)).toEqual(['STOOD', 'STOOD']);
    expect(round.hands[0]!.result).toBe('WIN');
    expect(round.hands[0]!.payout).toBe(200);
    expect(round.hands[1]!.result).toBe('LOSE'); // 16 contre 17
  });

  it('split jusqu’à 4 mains maximum', () => {
    let round = deal('VEGAS', 10, '8S', '6H', '8D', 'KC', '8H', '2S', '8C', '2H', '8S', '2C');
    round = play(round, 'SPLIT', 'SPLIT', 'SPLIT');
    expect(round.hands).toHaveLength(4);
    expect(round.hands[0]!.cards).toEqual(cards('8S', '8S')); // encore une paire
    expect(availableActions(round)).not.toContain('SPLIT');
  });

  it('permet de splitter deux figures de même valeur', () => {
    const round = deal('VEGAS', 100, 'KS', '6H', 'QD', '9C');
    expect(availableActions(round)).toContain('SPLIT');
  });
});

describe('Table Europe', () => {
  it('pas de carte cachée : le croupier n’a qu’une carte pendant le tour du joueur', () => {
    const round = deal('EUROPE', 100, 'KS', '9H', '7D');
    expect(round.dealer).toEqual(cards('9H'));
    expect(availableActions(round)).toEqual(['HIT', 'STAND']); // pas de double sur 17, pas d'abandon
  });

  it('double seulement sur 9, 10 ou 11', () => {
    expect(availableActions(deal('EUROPE', 100, '5S', '9H', '4D'))).toContain('DOUBLE');
    expect(availableActions(deal('EUROPE', 100, '6S', '9H', '6D'))).not.toContain('DOUBLE');
  });

  it('refuse l’abandon', () => {
    const round = deal('EUROPE', 100, 'KS', '9H', '6D');
    expect(() => applyAction(round, 'SURRENDER')).toThrow(IllegalActionError);
  });

  it('blackjack du croupier : le joueur perd aussi sa mise de double', () => {
    const round = play(deal('EUROPE', 100, '6S', 'KH', '5D', '9C', 'AS'), 'DOUBLE');
    expect(round.dealer).toEqual(cards('KH', 'AS'));
    expect(round.hands[0]!.bet).toBe(200);
    expect(round.hands[0]!.result).toBe('LOSE');
    expect(totalPayout(round)).toBe(0);
  });

  it('un seul split (2 mains maximum)', () => {
    const round = play(deal('EUROPE', 100, '8S', '6H', '8D', '8C', '2S'), 'SPLIT');
    expect(round.hands).toHaveLength(2);
    expect(availableActions(round)).not.toContain('SPLIT');
  });

  it('le croupier ne tire pas si toutes les mains ont sauté', () => {
    const round = play(deal('EUROPE', 100, 'KS', '9H', '6D', 'QC'), 'HIT');
    expect(round.dealer).toHaveLength(1);
    expect(round.hands[0]!.result).toBe('LOSE');
  });

  it('blackjack joueur : le croupier tire sa 2e carte pour vérifier', () => {
    const round = deal('EUROPE', 100, 'AS', 'KH', 'KD', 'AC');
    expect(round.dealer).toEqual(cards('KH', 'AC'));
    expect(round.hands[0]!.result).toBe('PUSH');
  });
});

describe('applyAction', () => {
  it('ne modifie jamais la partie d’entrée', () => {
    const round = deal('VEGAS', 100, 'KS', '9H', '7D', '8C', '2S');
    const snapshot = structuredClone(round);
    applyAction(round, 'HIT');
    expect(round).toEqual(snapshot);
  });

  it('refuse une action sur une partie terminée', () => {
    const round = deal('VEGAS', 100, 'AS', '9H', 'KD', '8C');
    expect(() => applyAction(round, 'HIT')).toThrow(IllegalActionError);
  });
});

describe('toRoundView', () => {
  it('cache la carte du croupier et le sabot pendant la partie', () => {
    const view = toRoundView(deal('VEGAS', 100, 'KS', '9H', '7D', 'AC', '2S'), 1);
    expect(view.dealer).toEqual({ cards: [card('9H'), null], value: 9, soft: false });
    expect(JSON.stringify(view)).not.toContain('"shoe"');
    expect(JSON.stringify(view)).not.toContain('"AC"');
    expect(view.totalPayout).toBeNull();
  });

  it('révèle tout une fois la partie réglée', () => {
    const view = toRoundView(play(deal('VEGAS', 100, 'KS', '9H', '7D', '9C'), 'STAND'), 2);
    expect(view.dealer.cards).toEqual(cards('9H', '9C'));
    expect(view.totalPayout).toBe(0);
  });
});
