import { create } from 'zustand';
import { Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  rooms: string[];
  setSocket: (socket: Socket | null) => void;
  setConnected: (connected: boolean) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  reset: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  rooms: [],

  setSocket: (socket) => set({ socket }),

  setConnected: (connected) => set({ connected }),

  joinRoom: (room) => {
    const { socket, rooms } = get();
    if (socket?.connected && !rooms.includes(room)) {
      socket.emit('join', room);
      set({ rooms: [...rooms, room] });
    }
  },

  leaveRoom: (room) => {
    const { socket, rooms } = get();
    if (socket?.connected && rooms.includes(room)) {
      socket.emit('leave', room);
      set({ rooms: rooms.filter((r) => r !== room) });
    }
  },

  reset: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, connected: false, rooms: [] });
  },
}));
