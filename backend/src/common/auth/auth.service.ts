import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly walletService: WalletService,
  ) {}

  loginMock(username: string) {
    const userId = `user-${username.toLowerCase()}`;
    const balance = this.walletService.getBalance(userId);
    const token = this.jwtService.sign({ sub: userId, username });

    return {
      user: {
        id: userId,
        username,
        email: `${username.toLowerCase()}@casino.local`,
        balance,
      },
      token,
    };
  }
}
