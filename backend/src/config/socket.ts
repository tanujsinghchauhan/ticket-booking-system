import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './env.js';

let io: SocketServer | null = null;

export function initSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    socket.on('join:show', (showId: string) => {
      socket.join(showId);
      console.log(`Socket ${socket.id} joined room for show: ${showId}`);
    });

    socket.on('leave:show', (showId: string) => {
      socket.leave(showId);
      console.log(`Socket ${socket.id} left room for show: ${showId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet.');
  }
  return io;
}

export function emitSeatUpdate(showId: string, event: 'seat:held' | 'seat:released' | 'seat:booked', data: any) {
  if (io) {
    io.to(showId).emit(event, data);
    console.log(`Socket emitted event ${event} to room ${showId}:`, data);
  }
}
