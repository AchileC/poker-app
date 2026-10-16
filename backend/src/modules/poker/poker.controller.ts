import { Body, Controller, Get, Post } from '@nestjs/common';
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

  @Post('sit-in')
  sitIn(@Body() body: { userId: string; amount: number; tableId: string }) {
    return this.pokerService.sitIn(body.userId, body.amount, body.tableId);
  }

  @Post('leave')
  leave(@Body() body: { userId: string; tableId: string }) {
    return this.pokerService.leaveTable(body.userId, body.tableId);
  }
}
