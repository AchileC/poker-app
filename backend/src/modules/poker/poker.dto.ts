import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class TableDto {
  @IsString()
  @IsNotEmpty()
  tableId!: string;
}

export class SitInDto extends TableDto {
  @IsInt()
  @IsPositive()
  buyIn!: number;
}
