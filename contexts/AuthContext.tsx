'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  nombres: string;
  apellidos: string;
  role: string;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  updateUser: (updatedUser: User) => void;
  refreshUser: () => Promise<void>;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar si hay token guardado
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const { token: newToken, user: userData } = data;
        
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        return { success: true };
      }
      
      // Capturar el mensaje de error del backend
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Usuario o contraseña incorrectos';
      
      return { success: false, error: errorMessage };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    router.push('/');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    if (!token || !user) return;
    
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const users = await response.json();
        const currentUser = users.data?.find((u: User) => u.id === user.id);
        if (currentUser) {
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const extendSession = useCallback(() => {
    // Reset timeout al extender sesión
    const event = new CustomEvent('sessionExtended');
    window.dispatchEvent(event);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUser, refreshUser, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
