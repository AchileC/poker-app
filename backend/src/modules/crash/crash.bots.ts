import { Injectable } from '@nestjs/common';
import { secureRandomInt } from '../../common/utils/csprng.util';

/**
 * Joueurs de la maison : animent les parties quand il y a peu de monde.
 * Ils n'influencent rien : le point de crash est tiré (et engagé par hash) avant les mises,
 * et leurs mises sont fictives (aucun appel au wallet, aucun jeton créé ou détruit).
 * Mentionnés dans les règles du jeu côté client.
 */

export interface HouseBetPlan {
  username: string;
  delayMs: number;
  amount: number;
  autoCashOut: number;
}

interface Profile {
  amounts: number[];
  targets: number[];
}

const PROFILES: Profile[] = [
  { amounts: [10, 20, 25, 50], targets: [110, 125, 140, 150, 175, 200] }, // prudent
  { amounts: [25, 50, 75, 100], targets: [150, 180, 200, 250, 300] }, // équilibré
  { amounts: [200, 250, 300, 500, 1000], targets: [115, 130, 150, 200] }, // gros joueur
  { amounts: [10, 15, 25, 50], targets: [500, 800, 1000, 2500, 5000] }, // chasseur de gros multiplicateurs
];

const NAMES = [
  'Lucas_93',
  'm4xime',
  'JulieB',
  'tomtom',
  'Sarah.k',
  'Nico77',
  'kevin_lyon',
  'Inès',
  'zZ_Raph_Zz',
  'Hugo.p',
  'Camille',
  'yanis13',
  'Lea_bzh',
  'Antoine',
  'bigbluff',
  'LuckyLou',
  'Mehdi_92',
  'Chloé',
  'theo.v',
  'QueenOfSpades',
  'Bastien',
  'Manon_',
  'Rayan',
  'ace_high',
  'Jordan',
  'Emma.l',
  'Samy',
  'Clem',
  'Victor',
  'nina.r',
];

function pick<T>(items: readonly T[]): T {
  return items[secureRandomInt(0, items.length)]!;
}

@Injectable()
export class CrashBots {
  /** Mises des joueurs de la maison pour une phase de mises de `bettingMs`. */
  planRound(bettingMs: number): HouseBetPlan[] {
    const names = [...NAMES];
    const count = secureRandomInt(4, 12);
    const plans: HouseBetPlan[] = [];

    for (let i = 0; i < count && names.length > 0; i++) {
      const [username] = names.splice(secureRandomInt(0, names.length), 1) as [string];
      // Chaque pseudo garde toujours le même style de jeu
      const profile = PROFILES[NAMES.indexOf(username) % PROFILES.length]!;
      plans.push({
        username,
        delayMs: secureRandomInt(300, Math.max(400, bettingMs - 400)),
        amount: pick(profile.amounts),
        autoCashOut: pick(profile.targets) + secureRandomInt(0, 15),
      });
    }
    return plans;
  }
}
