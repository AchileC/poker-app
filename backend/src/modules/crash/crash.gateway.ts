import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { AuthUser } from '../../common/auth/auth-user';
import { getSocketUser, userRoom, useWsJwtAuth } from '../../common/auth/ws-auth';
import { WsApiExceptionFilter } from '../../common/errors/api-exception.filter';
import { ApiErrorBody, toApiError } from '../../common/errors/app.exception';
import { PlaceBetDto } from './crash.dto';
import { CrashService } from './crash.service';

export type CrashAck<T> = ({ ok: true } & T) | { ok: false; error: ApiErrorBody };

/** Les erreurs métier reviennent dans l'ack : le client n'attend jamais une réponse qui ne viendra pas. */
async function respond<T extends object>(task: () => Promise<T>): Promise<CrashAck<T>> {
  try {
    return { ok: true, ...(await task()) };
  } catch (error) {
    return { ok: false, error: toApiError(error).body };
  }
}

/**
 * Événements diffusés : `state` (à la connexion), `round:betting`, `round:started`,
 * `player:bet`, `player:cashout`, `round:crashed` ; privés (tous les onglets du joueur) : `my:bet`, `my:cashout`.
 * Messages acceptés (avec ack `{ ok, ... }` ou `{ ok: false, error }`) : `bet`, `cashOut`.
 */
@WebSocketGateway({ namespace: '/crash' })
@UseFilters(new WsApiExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CrashGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Namespace;

  constructor(
    private readonly crashService: CrashService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(namespace: Namespace) {
    useWsJwtAuth(namespace, this.jwtService);
    this.crashService.attach({
      toAll: (event, payload) => namespace.emit(event, payload),
      toUser: (userId, event, payload) => namespace.to(userRoom(userId)).emit(event, payload),
    });
  }

  handleConnection(client: Socket) {
    const user = client.data.user as AuthUser | undefined;
    client.emit('state', this.crashService.getSnapshot(user?.sub));
  }

  @SubscribeMessage('bet')
  placeBet(@ConnectedSocket() client: Socket, @MessageBody() payload: PlaceBetDto) {
    return respond(() =>
      this.crashService.placeBet(
        getSocketUser(client),
        payload.amount,
        payload.autoCashOut ?? null,
      ),
    );
  }

  @SubscribeMessage('cashOut')
  cashOut(@ConnectedSocket() client: Socket) {
    return respond(() => this.crashService.cashOut(getSocketUser(client).sub));
  }
}
