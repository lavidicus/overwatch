import './config/env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import winston from 'winston';

// Import routes
import authRoutes from './routes/auth.js';
import csrfRoutes from './routes/csrf.js';
import settingsRoutes from './routes/settings.js';
import auditRoutes from './routes/audit.js';
import providersRoutes from './routes/providers.js';
import modelsRoutes from './routes/models.js';
import systemsRoutes from './routes/systems.js';
import whatllmRoutes from './routes/whatllm.js';
import aiProxyRoutes from './routes/ai-proxy.js';
import chatRoutes from './routes/chat.js';
import groupChatRoutes from './routes/group-chat.js';
import benchmarkRoutes from './routes/benchmark.js';
import huggingfaceRoutes from './routes/huggingface.js';
import toolsRoutes from './routes/tools.js';
import toolGrantsRoutes from './routes/tool-grants.js';
import routingRoutes from './routes/routing.js';
import queueRoutes from './routes/queue.js';
import memoryRoutes from './routes/memory.js';
import improvementRoutes, { proposalsRouter } from './routes/improvement.js';
import advisorsRoutes from './routes/advisors.js';
import { syncBuiltinTools } from './services/tools/index.js';
import { initQueues } from './services/queue/index.js';
import { initMemorySubsystem } from './services/memory/service.js';

// Import middleware
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { authenticate } from './middleware/auth.js';
import { socketAuthMiddleware, joinUserRoom } from './middleware/socketAuth.js';

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// Authentication for protected routes (not auth routes themselves)
app.use('/api/auth', authRoutes);
app.use('/api/csrf', csrfRoutes);
app.use('/api/settings', authenticate, settingsRoutes);
app.use('/api/audit', authenticate, auditRoutes);
app.use('/api/providers', authenticate, providersRoutes);
app.use('/api/models', authenticate, modelsRoutes);
app.use('/api/systems', authenticate, systemsRoutes);
app.use('/api/whatllm', authenticate, whatllmRoutes);

// Phase 3: Chat, AI Proxy, Benchmark, HuggingFace
app.use('/api/ai', aiProxyRoutes);
app.use('/api/chat', authenticate, chatRoutes);
app.use('/api/chat', authenticate, groupChatRoutes);
app.use('/api/benchmarks', authenticate, benchmarkRoutes);
app.use('/api/hf', authenticate, huggingfaceRoutes);

// Phase 3/4: Tools, Routing, Queue
app.use('/api/tools', authenticate, toolsRoutes);
app.use('/api/tool-grants', authenticate, toolGrantsRoutes);
app.use('/api/routing', authenticate, routingRoutes);
app.use('/api/queue', authenticate, queueRoutes);

// Phase 5: Memory (RAG) + Self-improvement engine
app.use('/api/memory', authenticate, memoryRoutes);
app.use('/api/improvement', authenticate, improvementRoutes);
app.use('/api/change-proposals', authenticate, proposalsRouter);
app.use('/api/advisors', authenticate, advisorsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'overwatch-api' });
});

// Socket.io connection handling
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id} (user: ${socket.data.email})`);

  // Auto-join user's personal room
  joinUserRoom(socket);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Join chat session room
  socket.on('join:chat', (sessionId: string) => {
    const room = `chat:${sessionId}`;
    if (socket.data.userId) {
      socket.join(room);
      logger.info(`Socket ${socket.id} joined chat room ${room}`);
      socket.emit('joined:chat', { sessionId, room });
    }
  });

  // Leave chat session room
  socket.on('leave:chat', (sessionId: string) => {
    const room = `chat:${sessionId}`;
    socket.leave(room);
    logger.info(`Socket ${socket.id} left chat room ${room}`);
  });

  // Join group chat room
  socket.on('group:join', (groupId: string) => {
    const room = `group:${groupId}`;
    if (socket.data.userId) {
      socket.join(room);
      logger.info(`Socket ${socket.id} joined group room ${room}`);
      socket.emit('group:joined', { groupId, room });
    }
  });

  // Leave group chat room
  socket.on('group:leave', (groupId: string) => {
    const room = `group:${groupId}`;
    socket.leave(room);
    logger.info(`Socket ${socket.id} left group room ${room}`);
  });

  // Join installation log room
  socket.on('join:install', (systemId: string) => {
    const room = `install:${systemId}`;
    if (socket.data.userId) {
      socket.join(room);
      logger.info(`Socket ${socket.id} joined install room ${room}`);
      socket.emit('joined:install', { systemId, room });
    }
  });

  // Leave installation log room
  socket.on('leave:install', (systemId: string) => {
    const room = `install:${systemId}`;
    socket.leave(room);
    logger.info(`Socket ${socket.id} left install room ${room}`);
  });

  // Notification events
  socket.on('notification', (data: { type: string; message: string; priority?: 'low' | 'medium' | 'high' }) => {
    // Emit to user's personal room
    if (socket.data.userId) {
      io.to(`user:${socket.data.userId}`).emit('notification', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      logger.debug(`Notification sent to user ${socket.data.userId}: ${data.message}`);
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
httpServer.listen(PORT, async () => {
  logger.info(`Overwatch backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Phase 3/4 boot tasks
  try {
    await syncBuiltinTools();
    logger.info('Built-in tools synced');
  } catch (err) {
    logger.error('Failed to sync built-in tools', err);
  }
  try {
    await initQueues();
    logger.info('Queue system initialized');
  } catch (err) {
    logger.error('Failed to init queue', err);
  }
  try {
    await initMemorySubsystem();
    logger.info('Memory subsystem initialized');
  } catch (err) {
    logger.error('Failed to init memory subsystem', err);
  }
});

// Export io for use in routes
export const getIO = () => io;

export { app, io, logger };
