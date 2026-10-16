import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser, CurrentUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

const MOCK_TOP_UP_AMOUNT = 500;

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: AuthUser) {
    return { balance: await this.walletService.getBalance(user.sub) };
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: AuthUser) {
    return this.walletService.getHistory(user.sub);
  }

  /** Rechargement gratuit bouchonné (Jour 1), remplacé par la boutique du Dev 2. */
  @Post('mock-top-up')
  async mockTopUp(@CurrentUser() user: AuthUser) {
    const { newBalance } = await this.walletService.credit(
      user.sub,
      MOCK_TOP_UP_AMOUNT,
      'SHOP',
      `shop:mock-top-up:${randomUUID()}`,
    );
    return { newBalance };
  }
}
