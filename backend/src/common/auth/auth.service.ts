import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WalletService } from '../wallet/wallet.service';
import { AuthUser } from './auth-user';

/**
 * Auth bouchonnée (Jour 1) : n'importe quel pseudo obtient un JWT valide.
 * Le Dev 2 remplace loginMock par une vraie inscription/connexion sans changer le payload du JWT.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly walletService: WalletService,
  ) {}

  async loginMock(username: string) {
    const payload: AuthUser = { sub: `user-${username.toLowerCase()}`, username };
    return {
      user: await this.getProfile(payload),
      token: this.jwtService.sign(payload),
    };
  }

  async getProfile(authUser: AuthUser) {
    return {
      id: authUser.sub,
      username: authUser.username,
      email: `${authUser.username.toLowerCase()}@casino.local`,
      balance: await this.walletService.getBalance(authUser.sub),
    };
  }
}
