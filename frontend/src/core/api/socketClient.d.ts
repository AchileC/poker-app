import { type Socket } from 'socket.io-client';
export declare function getSocketClient(namespace?: string): Socket;
export declare function disconnectSocketClient(): void;
