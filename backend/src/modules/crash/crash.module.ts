import { Module } from '@nestjs/common';
import { CrashBots } from './crash.bots';
import { CrashGateway } from './crash.gateway';
import { CrashService, crashSeedFactoryProvider } from './crash.service';

@Module({
  providers: [CrashService, CrashBots, CrashGateway, crashSeedFactoryProvider],
})
export class CrashModule {}
