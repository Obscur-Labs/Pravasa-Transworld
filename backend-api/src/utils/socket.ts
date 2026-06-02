import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

interface SocketUser {
  id: string;
  role: 'user' | 'admin';
}

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.ADMIN_URL || 'http://localhost:3001',
      ],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      (socket as any).user = {
        id: decoded.id,
        role: decoded.role || 'user', // Assuming default is user if not specified in your JWT, but adjust if admin has role='admin'
      };
      
      // Better to check if the token belongs to an admin.
      // Usually, admin login sets role='admin'.
      if (decoded.role === 'admin' || decoded.isAdmin) {
          (socket as any).user.role = 'admin';
      } else {
          (socket as any).user.role = 'user';
      }
      
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user as SocketUser;
    
    if (user.role === 'admin') {
      socket.join('admin_room');
      console.log(`Admin connected and joined admin_room: ${socket.id}`);
    } else {
      socket.join(`user_${user.id}`);
      console.log(`User connected and joined user_${user.id}: ${socket.id}`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
