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
  const [isConnected, setIsConnected] = useState(true); // Mock as connected for testing

  useEffect(() => {
    // Connect to real socket server
    const newSocket = io('http://localhost:3001');
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });
    
    setSocket(newSocket);
    
    return () => {
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