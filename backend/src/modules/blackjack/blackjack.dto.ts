import { IsIn, IsInt, Min } from 'class-validator';
import { BlackjackAction, TableType } from './engine/blackjack.types';

const TABLES: TableType[] = ['VEGAS', 'EUROPE'];
const ACTIONS: BlackjackAction[] = [
  'HIT',
  'STAND',
  'DOUBLE',
  'SPLIT',
  'SURRENDER',
  'INSURANCE',
  'EVEN_MONEY',
  'NO_INSURANCE',
];

export class StartRoundDto {
  @IsIn(TABLES)
  table!: TableType;

  /** Limites vérifiées par le service selon la table. */
  @IsInt()
  bet!: number;
}

export class RoundActionDto {
  @IsIn(ACTIONS)
  action!: BlackjackAction;

  /** Version de la partie vue par le client (protection contre le double-clic). */
  @IsInt()
  @Min(0)
  version!: number;
}
