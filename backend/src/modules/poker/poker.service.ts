import { Injectable } from '@nestjs/common';
import { WalletService } from '../../common/wallet/wallet.service';

export type PokerState =
  | 'WAITING'
  | 'BLINDS'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN';

@Injectable()
export class PokerService {
  private readonly tableStacks = new Map<string, number>();

  constructor(private readonly walletService: WalletService) {}

  sitIn(userId: string, buyInAmount: number, tableId: string) {
    const tx = this.walletService.debit(userId, buyInAmount, 'POKER', tableId);
    const key = `${tableId}:${userId}`;
    this.tableStacks.set(key, (this.tableStacks.get(key) ?? 0) + buyInAmount);

    return {
      tableId,
      userId,
      tableStack: this.tableStacks.get(key)!,
      walletBalance: tx.newBalance,
    };
  }

  leaveTable(userId: string, tableId: string) {
    const key = `${tableId}:${userId}`;
    const stack = this.tableStacks.get(key) ?? 0;
    this.tableStacks.delete(key);

    if (stack > 0) {
      const tx = this.walletService.credit(userId, stack, 'POKER', tableId);
      return {
        tableId,
        userId,
        cashedOut: stack,
        walletBalance: tx.newBalance,
      };
    }

    return {
      tableId,
      userId,
      cashedOut: 0,
      walletBalance: this.walletService.getBalance(userId),
    };
  }
}
