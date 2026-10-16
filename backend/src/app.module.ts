import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './common/auth/auth.module';
import { WalletModule } from './common/wallet/wallet.module';
import { PokerModule } from './modules/poker/poker.module';
import { BlackjackModule } from './modules/blackjack/blackjack.module';
import { RouletteModule } from './modules/roulette/roulette.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    AuthModule,
    WalletModule,
    PokerModule,
    BlackjackModule,
    RouletteModule,
  ],
})
export class AppModule {}
