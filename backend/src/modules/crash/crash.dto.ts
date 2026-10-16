import { IsInt, IsOptional } from 'class-validator';

export class PlaceBetDto {
  /** Limites vérifiées par le service. */
  @IsInt()
  amount!: number;

  /** Encaissement automatique en centièmes (200 = 2,00×). */
  @IsOptional()
  @IsInt()
  autoCashOut?: number;
}
