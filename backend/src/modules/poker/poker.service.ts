import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WalletService } from '../../common/wallet/wallet.service';

export type PokerState = 'WAITING' | 'BLINDS' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

@Injectable()
export class PokerService {
  private readonly tableStacks = new Map<string, number>();

  constructor(private readonly walletService: WalletService) {}

  async sitIn(userId: string, buyIn: number, tableId: string) {
    const tx = await this.walletService.debit(
      userId,
      buyIn,
      'POKER',
      `poker:${tableId}:buyin:${randomUUID()}`,
    );
    const key = `${tableId}:${userId}`;
    const tableStack = (this.tableStacks.get(key) ?? 0) + buyIn;
    this.tableStacks.set(key, tableStack);

    return { tableId, userId, tableStack, newBalance: tx.newBalance };
  }

  async leaveTable(userId: string, tableId: string) {
    const key = `${tableId}:${userId}`;
    const stack = this.tableStacks.get(key) ?? 0;
    this.tableStacks.delete(key);

    const newBalance =
      stack > 0
        ? (
            await this.walletService.credit(
              userId,
              stack,
              'POKER',
              `poker:${tableId}:cashout:${randomUUID()}`,
            )
          ).newBalance
        : await this.walletService.getBalance(userId);

    return { tableId, userId, cashedOut: stack, newBalance };
  }
}
