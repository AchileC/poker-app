import { Injectable } from '@nestjs/common';
import { WalletService } from '../../common/wallet/wallet.service';

@Injectable()
export class BlackjackService {
  constructor(private readonly walletService: WalletService) {}

  getStatus() {
    return {
      module: 'BLACKJACK',
      status: 'READY',
    };
  }
}
