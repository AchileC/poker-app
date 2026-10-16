import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Namespace, Socket } from 'socket.io';
import { AppException } from '../errors/app.exception';
import { AuthUser } from './auth-user';

/** Room privée d'un joueur : tous ses sockets la rejoignent à la connexion. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Vérifie le JWT au handshake Socket.IO (client : `io(url, { auth: { token } })`).
 * Sans token valide, la connexion est refusée (`connect_error` côté client).
 * À appeler dans `afterInit(server)` de chaque gateway.
 */
export function useWsJwtAuth(namespace: Namespace, jwtService: JwtService): void {
  namespace.use((socket, next) => {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) {
      return next(new Error('UNAUTHORIZED'));
    }
    try {
      socket.data.user = jwtService.verify<AuthUser>(token);
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  namespace.on('connection', (socket) => {
    void socket.join(userRoom(getSocketUser(socket).sub));
  });
}

/** Récupère le joueur authentifié d'un socket (jamais depuis le payload du message). */
export function getSocketUser(client: Socket): AuthUser {
  const user = client.data.user as AuthUser | undefined;
  if (!user) {
    throw new AppException('UNAUTHORIZED', 'Socket non authentifié.', HttpStatus.UNAUTHORIZED);
  }
  return user;
}
