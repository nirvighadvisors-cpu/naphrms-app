import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/', '') || 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Connect to the Socket.IO server.
 * Uses cookies for auth (withCredentials: true), same as the REST API.
 */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,  // Send httpOnly cookie
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[Socket.IO] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket.IO] Connection error:', err.message);
  });

  return socket;
}

/**
 * Disconnect the Socket.IO client.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance (may be null if not connected).
 */
export function getSocket(): Socket | null {
  return socket;
}
