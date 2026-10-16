import { io } from 'socket.io-client';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
let socketInstance = null;
export function getSocketClient(namespace = '/poker') {
    if (!socketInstance) {
        const token = localStorage.getItem('casino_jwt_token');
        socketInstance = io(`${WS_URL}${namespace}`, {
            autoConnect: false,
            auth: {
                token,
            },
        });
    }
    return socketInstance;
}
export function disconnectSocketClient() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}
