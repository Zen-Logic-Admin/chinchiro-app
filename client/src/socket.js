import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : undefined;
export const socket = io(SOCKET_URL, { autoConnect: false });
