import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/auth/auth-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { SitInDto, TableDto } from './poker.dto';
import { PokerService } from './poker.service';

@Controller('poker')
export class PokerController {
  constructor(private readonly pokerService: PokerService) {}

  @Get('status')
  getStatus() {
    return {
      module: 'POKER',
      format: "Texas Hold'em No-Limit (6-max)",
      status: 'READY',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sit-in')
  sitIn(@CurrentUser() user: AuthUser, @Body() body: SitInDto) {
    return this.pokerService.sitIn(user.sub, body.buyIn, body.tableId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('leave')
  leave(@CurrentUser() user: AuthUser, @Body() body: TableDto) {
    return this.pokerService.leaveTable(user.sub, body.tableId);
  }
}
