import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/auth/auth-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RoundActionDto, StartRoundDto } from './blackjack.dto';
import { BlackjackService } from './blackjack.service';

@Controller('blackjack')
export class BlackjackController {
  constructor(private readonly blackjackService: BlackjackService) {}

  @Get('tables')
  getTables() {
    return this.blackjackService.getTables();
  }

  @UseGuards(JwtAuthGuard)
  @Post('rounds')
  startRound(@CurrentUser() user: AuthUser, @Body() body: StartRoundDto) {
    return this.blackjackService.startRound(user.sub, body.table, body.bet);
  }

  @UseGuards(JwtAuthGuard)
  @Get('rounds/current')
  getCurrent(@CurrentUser() user: AuthUser) {
    return this.blackjackService.getCurrent(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rounds/:id/actions')
  act(@CurrentUser() user: AuthUser, @Param('id') roundId: string, @Body() body: RoundActionDto) {
    return this.blackjackService.act(user.sub, roundId, body.action, body.version);
  }
}
