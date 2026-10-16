import { Injectable } from '@nestjs/common';
import { WalletService } from '../../common/wallet/wallet.service';
import { secureRandomInt } from '../../common/utils/csprng.util';

@Injectable()
export class RouletteService {
  constructor(private readonly walletService: WalletService) {}

  getStatus() {
    return {
      module: 'ROULETTE',
      status: 'READY',
      sampleSpin: secureRandomInt(0, 37),
    };
  }
}
