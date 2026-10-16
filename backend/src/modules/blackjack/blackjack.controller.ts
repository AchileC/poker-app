import { Controller, Get } from '@nestjs/common';
import { BlackjackService } from './blackjack.service';

@Controller('blackjack')
export class BlackjackController {
  constructor(private readonly blackjackService: BlackjackService) {}

  @Get('status')
  getStatus() {
    return this.blackjackService.getStatus();
  }
}
