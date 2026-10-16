import { Module } from '@nestjs/common';
import { BlackjackController } from './blackjack.controller';
import { BlackjackService, shoeFactoryProvider } from './blackjack.service';
import { BlackjackRoundStore } from './blackjack.store';

@Module({
  controllers: [BlackjackController],
  providers: [BlackjackService, BlackjackRoundStore, shoeFactoryProvider],
})
export class BlackjackModule {}
