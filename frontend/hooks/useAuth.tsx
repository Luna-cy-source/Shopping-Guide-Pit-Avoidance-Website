/**
 * useAuth Hook — React 状态管理 + 自定义认证系统
 */
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  register as registerUser,
  login as loginUser,
  logout as logoutUser,
  getCurrentSession,
  getCurrentUser,
  isAuthenticated as checkAuth,
  type UserInfo,
  type AuthResult,
} from '../lib/auth';

// Re-export types
export type { AuthResult, UserInfo } from '../lib/auth';

// ============================================
// Context
// ============================================
interface AuthContextValue {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, password: string, nickname?: string) => Promise<AuthResult>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  refreshUser: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ============================================
// Provider
// ============================================
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 localStorage 恢复会话
  useEffect(() => {
    try {
      const session = getCurrentSession();
      if (session?.user) {
        setUser(session.user);
      }
    } catch {
      // 忽略解析错误
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    const result = await loginUser(username, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  const register = useCallback(async (username: string, password: string, nickname?: string): Promise<AuthResult> => {
    const result = await registerUser(username, password, nickname);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    const u = getCurrentUser();
    if (u) setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
