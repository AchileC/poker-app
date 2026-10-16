import { Module } from '@nestjs/common';
import { PokerController } from './poker.controller';
import { PokerGateway } from './poker.gateway';
import { PokerService } from './poker.service';

@Module({
  controllers: [PokerController],
  providers: [PokerService, PokerGateway],
})
export class PokerModule {}
