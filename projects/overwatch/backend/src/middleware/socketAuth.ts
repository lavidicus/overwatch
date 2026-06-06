import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Socket.io JWT Authentication Middleware
 * 
 * Usage on client:
 * const socket = io(url, {
 *   auth: { token: 'jwt-token-here' }
 * });
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: any) => void) {
  const token = socket.handshake.auth.token;

  if (!token) {
    logger.warn(`Socket ${socket.id} connection rejected: no token provided`);
    return next(new Error('Authentication required'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Attach user info to socket for later use
    socket.data.userId = payload.userId;
    socket.data.email = payload.email;
    socket.data.role = payload.role;

    logger.info(`Socket ${socket.id} authenticated as ${payload.email} (${payload.role})`);
    next();
  } catch (error: any) {
    logger.warn(`Socket ${socket.id} authentication failed: ${error.message}`);
    next(new Error('Invalid or expired token'));
  }
}

/**
 * Join user to their personal room
 * Room format: user:{userId}
 */
export function joinUserRoom(socket: Socket) {
  const userId = socket.data.userId;
  if (userId) {
    const room = `user:${userId}`;
    socket.join(room);
    logger.info(`Socket ${socket.id} joined room ${room}`);
  }
}

/**
 * Join chat session room
 * Room format: chat:{sessionId}
 */
export function joinChatRoom(socket: Socket, sessionId: string) {
  const room = `chat:${sessionId}`;
  socket.join(room);
  logger.info(`Socket ${socket.id} joined chat room ${room}`);
}

/**
 * Join installation log room
 * Room format: install:{systemId}
 */
export function joinInstallRoom(socket: Socket, systemId: string) {
  const room = `install:${systemId}`;
  socket.join(room);
  logger.info(`Socket ${socket.id} joined install room ${room}`);
}

/**
 * Leave a room
 */
export function leaveRoom(socket: Socket, room: string) {
  socket.leave(room);
  logger.info(`Socket ${socket.id} left room ${room}`);
}

/**
 * Emit event to a specific room
 */
export function emitToRoom(io: any, room: string, event: string, data: any) {
  io.to(room).emit(event, data);
  logger.debug(`Emitted ${event} to room ${room}`);
}

/**
 * Emit event to user's personal room
 */
export function emitToUser(io: any, userId: string, event: string, data: any) {
  const room = `user:${userId}`;
  emitToRoom(io, room, event, data);
}

/**
 * Check if user has permission to access a room
 */
export function hasRoomAccess(socket: Socket, room: string): boolean {
  const userRole = socket.data.role;
  const userId = socket.data.userId;

  // Admins can access all rooms
  if (userRole === 'ADMIN') return true;

  // Check room type
  if (room.startsWith('user:')) {
    // Users can only access their own user room
    const roomUserId = room.split(':')[1];
    return roomUserId === userId;
  }

  // Operators and above can access chat and install rooms
  if (userRole === 'OPERATOR' || userRole === 'ADMIN') {
    return true;
  }

  // Regular users can only access rooms they're explicitly added to
  // This would require checking database permissions
  return false;
}

export default socketAuthMiddleware;
