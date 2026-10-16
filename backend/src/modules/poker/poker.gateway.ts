import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PokerService } from './poker.service';

@WebSocketGateway({
  namespace: '/poker',
  cors: {
    origin: '*',
  },
})
export class PokerGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly pokerService: PokerService) {}

  @SubscribeMessage('joinTable')
  handleJoinTable(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tableId: string; userId: string; buyIn: number },
  ) {
    const room = `/topic/table/${payload.tableId}`;
    client.join(room);
    const state = this.pokerService.sitIn(payload.userId, payload.buyIn, payload.tableId);
    this.server.to(room).emit('tableState', state);
    return state;
  }
}
