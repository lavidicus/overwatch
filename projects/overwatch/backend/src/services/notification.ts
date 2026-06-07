import { getIO } from '../index.js';
import { emitToUser, emitToRoom } from '../middleware/socketAuth.js';

export interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  title?: string;
  priority?: 'low' | 'medium' | 'high';
  data?: any;
  timestamp?: string;
}

/**
 * Notification Service - Real-time notifications via Socket.io
 * 
 * Usage in routes:
 * import { notify } from '../services/notification';
 * notify.user(userId, { type: 'success', message: 'Provider connected!' });
 */
export class NotificationService {
  /**
   * Send notification to a specific user
   */
  static user(userId: string, notification: Notification) {
    const io = getIO();
    if (!io) {
      console.warn('Socket.io not initialized, skipping notification');
      return;
    }

    const fullNotification = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    };

    emitToUser(io, userId, 'notification', fullNotification);
  }

  /**
   * Send notification to all users in a chat session
   */
  static chatSession(sessionId: string, notification: Notification) {
    const io = getIO();
    if (!io) {
      console.warn('Socket.io not initialized, skipping notification');
      return;
    }

    const fullNotification = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    };

    emitToRoom(io, `chat:${sessionId}`, 'notification', fullNotification);
  }

  /**
   * Send notification to all users monitoring an installation
   */
  static installation(systemId: string, notification: Notification) {
    const io = getIO();
    if (!io) {
      console.warn('Socket.io not initialized, skipping notification');
      return;
    }

    const fullNotification = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    };

    emitToRoom(io, `install:${systemId}`, 'notification', fullNotification);
  }

  /**
   * Broadcast notification to all connected users
   */
  static broadcast(notification: Notification) {
    const io = getIO();
    if (!io) {
      console.warn('Socket.io not initialized, skipping notification');
      return;
    }

    const fullNotification = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    };

    io.emit('notification', fullNotification);
  }

  /**
   * Send provider status update
   */
  static providerStatus(providerId: string, status: string, latencyMs?: number) {
    this.broadcast({
      type: 'info',
      title: 'Provider Status Update',
      message: `Provider ${providerId} is now ${status}${latencyMs ? ` (${latencyMs}ms)` : ''}`,
      data: { providerId, status, latencyMs },
    });
  }

  /**
   * Send model download progress
   */
  static modelDownload(modelId: string, progress: number, status: string) {
    this.broadcast({
      type: progress === 100 ? 'success' : 'info',
      title: 'Model Download',
      message: `Model ${modelId}: ${status} (${progress.toFixed(1)}%)`,
      data: { modelId, progress, status },
    });
  }

  /**
   * Send system health check result
   */
  static systemHealth(systemId: string, healthy: boolean, details?: string) {
    this.broadcast({
      type: healthy ? 'success' : 'error',
      title: 'System Health Check',
      message: `System ${systemId}: ${healthy ? 'Healthy' : 'Unhealthy'}${details ? ` - ${details}` : ''}`,
      data: { systemId, healthy, details },
    });
  }

  /**
   * Send installation log update
   */
  static installationLog(systemId: string, logLine: string, level: 'info' | 'warn' | 'error' = 'info') {
    const io = getIO();
    if (!io) return;

    emitToRoom(io, `install:${systemId}`, 'install:log', {
      line: logLine,
      level,
      timestamp: new Date().toISOString(),
    });
  }
}

export const notify = NotificationService;
export default notify;
