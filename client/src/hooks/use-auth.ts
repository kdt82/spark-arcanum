
import React, { useState, useEffect, createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Check current session
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('sessionToken');
        if (!token) {
          return null;
        }

        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated, clear any stored token
            localStorage.removeItem('sessionToken');
            return null;
          }
          throw new Error('Failed to check session');
        }

        const data = await response.json();
        return data.success ? data.user : null;
      } catch (error) {
        localStorage.removeItem('sessionToken');
        return null;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });

  useEffect(() => {
    setUser(sessionData || null);
  }, [sessionData]);

  const loginMutation = useMutation({
    mutationFn: async ({ usernameOrEmail, password }: { usernameOrEmail: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail, password }),
        credentials: 'include',
      });

      const data = await response.json();
      
      // Check both HTTP status and response data for authentication failure
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }
      
      return data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ username, email, password }: { username: string; email: string; password: string }) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
        credentials: 'include',
      });

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setUser(data.user);
        if (data.sessionToken) {
          localStorage.setItem('sessionToken', data.sessionToken);
        }
        queryClient.invalidateQueries({ queryKey: ['auth'] });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken') || ''}`
        }
      });

      return response.json();
    },
    onSuccess: () => {
      setUser(null);
      localStorage.removeItem('sessionToken');
      queryClient.clear();
    },
  });

  const login = async (usernameOrEmail: string, password: string) => {
    const result = await loginMutation.mutateAsync({ usernameOrEmail, password });
    return result;
  };

  const register = async (username: string, email: string, password: string) => {
    const result = await registerMutation.mutateAsync({ username, email, password });
    return result;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return {
    user,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };
};



export { AuthContext };
