import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser } from '../types/auth';
import type { RefreshResponse } from '../types/auth';
import { loginApi, registerApi, logoutApi } from '../api/auth';
import { setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from '../api/client';
import axios from 'axios';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore session on mount
  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      axios.post<RefreshResponse>('/api/auth/refresh', { refreshToken })
        .then((response) => {
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          setAccessToken(accessToken);
          setRefreshToken(newRefreshToken);

          // Decode user from access token
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            role: payload.role,
          });
        })
        .catch(() => {
          clearTokens();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginApi({ email, password });
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await registerApi({ name, email, password });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
