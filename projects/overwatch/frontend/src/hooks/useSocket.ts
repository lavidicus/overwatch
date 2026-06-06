import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../utils/auth';

let _socket: Socket | null = null;

export function getSocket(): Socket | null {
  return _socket;
}

export function initSocket(): Socket | null {
  if (_socket && _socket.connected) return _socket;
  if (_socket) return _socket;

  const token = getAuthToken();
  if (!token) return null;

  _socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket'],
  });

  _socket.on('connect', () => {
    console.log('Socket connected');
  });

  _socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return _socket;
}

export function leaveChatSession(sessionId: string) {
  const socket = getSocket();
  if (socket) socket.emit('chat:leave', sessionId);
}

// ─── Rich useSocket hook for NotificationBell ───

export interface Notification {
  type: string;
  message: string;
  title?: string;
  priority?: string;
  data?: any;
  timestamp?: string;
}

interface UseSocketOptions {
  autoConnect?: boolean;
  onNotification?: (notification: Notification) => void;
  onError?: (error: unknown) => void;
}

interface UseSocketReturn {
  subscribeToNotifications: (handler: (notification: Notification) => void) => void;
  unsubscribeFromNotifications: (handler: (notification: Notification) => void) => void;
  connected: boolean;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true, onNotification, onError } = options;
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Set<(notification: Notification) => void>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    const socket = initSocket();
    if (!socket) return;
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onNotificationEvent = (notification: Notification) => {
      handlersRef.current.forEach(h => h(notification));
      onNotification?.(notification);
    };
    const onErrorEvent = (error: unknown) => {
      onError?.(error);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('notification', onNotificationEvent);
    socket.on('error', onErrorEvent);

    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('notification', onNotificationEvent);
      socket.off('error', onErrorEvent);
    };
  }, []);

  const subscribeToNotifications = useCallback((handler: (notification: Notification) => void) => {
    handlersRef.current.add(handler);
  }, []);

  const unsubscribeFromNotifications = useCallback((handler: (notification: Notification) => void) => {
    handlersRef.current.delete(handler);
  }, []);

  return { subscribeToNotifications, unsubscribeFromNotifications, connected };
}

// ─── Chat-specific event hook ───

export function useChatEvents(
  sessionId: string | null,
  onMessageDelta: (delta: string) => void,
  onMessageComplete: (content: string) => void,
  onError: (error: string) => void,
  onTyping: () => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket() || initSocket();
    if (!socket) return;

    socketRef.current = socket;
    socket.emit('chat:join', sessionId);

    const onDelta = (data: { sessionId: string; delta: string }) => {
      if (data.sessionId === sessionId) onMessageDelta(data.delta);
    };
    const onComplete = (data: { sessionId: string; content: string }) => {
      if (data.sessionId === sessionId) onMessageComplete(data.content);
    };
    const onErrorEvent = (data: { sessionId: string; error: string }) => {
      if (data.sessionId === sessionId) onError(data.error);
    };
    const onTypingEvent = (data: { sessionId: string }) => {
      if (data.sessionId === sessionId) onTyping();
    };

    socket.on('chat:message:delta', onDelta);
    socket.on('chat:message:complete', onComplete);
    socket.on('chat:error', onErrorEvent);
    socket.on('chat:typing', onTypingEvent);

    return () => {
      socket.off('chat:message:delta', onDelta);
      socket.off('chat:message:complete', onComplete);
      socket.off('chat:error', onErrorEvent);
      socket.off('chat:typing', onTypingEvent);
    };
  }, [sessionId, onMessageDelta, onMessageComplete, onError, onTyping]);
}
