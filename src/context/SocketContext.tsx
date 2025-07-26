import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string, userData: any) => void;
  nominatePlayer: (roomId: string, player: any) => void;
  placeBid: (roomId: string, bidData: any) => void;
  startDraft: (roomId: string) => void;
  toggleDraftPause: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinRoom: () => {},
  nominatePlayer: () => {},
  placeBid: () => {},
  startDraft: () => {},
  toggleDraftPause: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to socket server with webcontainer-friendly configuration
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log('Attempting to connect to:', serverUrl);
    
    const newSocket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });
    
    setSocket(newSocket);
    
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  const joinRoom = (roomId: string, userData: any) => {
    if (socket) {
      socket.emit('join-room', roomId, userData);
    }
  };

  const nominatePlayer = (roomId: string, player: any) => {
    if (socket) {
      socket.emit('nominate-player', roomId, player);
    }
  };

  const placeBid = (roomId: string, bidData: any) => {
    if (socket) {
      socket.emit('place-bid', roomId, bidData);
    }
  };

  const startDraft = (roomId: string) => {
    if (socket) {
      socket.emit('start-draft', roomId);
    }
  };

  const toggleDraftPause = (roomId: string) => {
    if (socket) {
      socket.emit('toggle-draft-pause', roomId);
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected, 
      joinRoom, 
      nominatePlayer, 
      placeBid,
      startDraft,
      toggleDraftPause
    }}>
      {children}
    </SocketContext.Provider>
  );
};