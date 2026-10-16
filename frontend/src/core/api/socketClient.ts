import { io, type Socket } from 'socket.io-client';
import { TOKEN_STORAGE_KEY } from './httpClient';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

const sockets = new Map<string, Socket>();

/**
 * Socket.IO authentifié par JWT au handshake (Section 5.2).
 * Les erreurs serveur arrivent sur l'événement `exception` au format ApiError.
 */
export function getSocketClient(namespace = '/poker'): Socket {
  let socket = sockets.get(namespace);
  if (!socket) {
    socket = io(`${WS_URL}${namespace}`, {
      autoConnect: false,
      // Relu à chaque (re)connexion : un nouveau token après login est pris en compte
      auth: (cb) => cb({ token: localStorage.getItem(TOKEN_STORAGE_KEY) }),
    });
    sockets.set(namespace, socket);
  }
  return socket;
}

export function disconnectSocketClient(): void {
  sockets.forEach((socket) => socket.disconnect());
  sockets.clear();
}
