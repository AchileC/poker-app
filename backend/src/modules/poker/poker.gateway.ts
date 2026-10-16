import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { getSocketUser, useWsJwtAuth } from '../../common/auth/ws-auth';
import { WsApiExceptionFilter } from '../../common/errors/api-exception.filter';
import { SitInDto } from './poker.dto';
import { PokerService } from './poker.service';

/** Room publique d'une table : état public uniquement (jamais de holeCards ni de solde). */
export function tableRoom(tableId: string): string {
  return `table:${tableId}`;
}

// CORS : géré globalement par CorsIoAdapter (main.ts)
@WebSocketGateway({ namespace: '/poker' })
@UseFilters(new WsApiExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PokerGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Namespace;

  constructor(
    private readonly pokerService: PokerService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(namespace: Namespace) {
    useWsJwtAuth(namespace, this.jwtService);
  }

  @SubscribeMessage('joinTable')
  async handleJoinTable(@ConnectedSocket() client: Socket, @MessageBody() payload: SitInDto) {
    const user = getSocketUser(client);
    const result = await this.pokerService.sitIn(user.sub, payload.buyIn, payload.tableId);

    await client.join(tableRoom(payload.tableId));
    this.server.to(tableRoom(payload.tableId)).emit('tableState', {
      tableId: result.tableId,
      userId: result.userId,
      tableStack: result.tableStack,
    });

    // Réponse (ack) privée au joueur : contient son nouveau solde
    return result;
  }
}
