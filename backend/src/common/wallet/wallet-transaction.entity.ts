import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { GameType, TransactionType } from './wallet.types';

@Entity('wallet_transactions')
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ type: 'varchar', length: 16 })
  type!: TransactionType;

  @Column({ type: 'varchar', length: 32 })
  gameType!: GameType;

  @Column()
  referenceId!: string;

  @Column({ type: 'integer' })
  balanceAfter!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
