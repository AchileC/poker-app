import { Controller, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':userId/balance')
  getBalance(@Param('userId') userId: string) {
    return {
      userId,
      balance: this.walletService.getBalance(userId),
    };
  }

  @Get(':userId/transactions')
  getTransactions(@Param('userId') userId: string) {
    return this.walletService.getHistory(userId);
  }
}
