import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateTeam: (teamName: string, teamLogo: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isLoading: false,
  updateTeam: async () => false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Demo mode - mock authentication without backend
      const mockUsers = [
        { id: 'user-1', username: 'commissioner', password: 'draft2024', role: 'commissioner', teamId: 'team-1', teamName: 'Commissioner', teamLogo: '👑' },
        { id: 'user-2', username: 'user1', password: 'password1', role: 'user', teamId: 'team-2', teamName: 'Team 1', teamLogo: '🏈' },
        { id: 'user-3', username: 'user2', password: 'password2', role: 'user', teamId: 'team-3', teamName: 'Team 2', teamLogo: '⚡' },
        { id: 'user-4', username: 'user3', password: 'password3', role: 'user', teamId: 'team-4', teamName: 'Team 3', teamLogo: '🔥' },
        { id: 'user-5', username: 'user4', password: 'password4', role: 'user', teamId: 'team-5', teamName: 'Team 4', teamLogo: '🚀' },
      ];
      
      const user = mockUsers.find(u => u.username === username && u.password === password);
      
      if (user) {
        const { password: _, ...userData } = user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTeam = async (teamName: string, teamLogo: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Demo mode - update team locally
      const updatedUser = { ...user, teamName, teamLogo };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return true;
    } catch (error) {
      console.error('Update team error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, updateTeam }}>
      {children}
    </AuthContext.Provider>
  );
};