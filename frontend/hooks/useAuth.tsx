/**
 * useAuth Hook — React 状态管理 + CloudBase 真实认证
 *
 * 改造前：从 localStorage 恢复会话（假登录）
 * 改造后：从 CloudBase Auth getSession() 恢复真实登录态
 */
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  register as registerUser,
  login as loginUser,
  logout as logoutUser,
  getCurrentSessionAsync,
  getCurrentUser,
  isAuthenticated as checkAuth,
  cacheUserInfo,
  type UserInfo,
  type AuthResult,
} from '../lib/auth';

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

  // 初始化：先从本地缓存快速恢复，再异步验证 CloudBase session
  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      try {
        // 1. 先从缓存读取（立即渲染 UI）
        const cached = getCurrentUser();
        if (cached && !cancelled) {
          setUser(cached);
        }

        // 2. 再从 CloudBase 验证真实登录状态
        const session = await getCurrentSessionAsync();
        if (!cancelled) {
          if (session?.user) {
            setUser(session.user);
          } else {
            // CloudBase 无有效 session → 清除本地缓存
            setUser(null);
            if (!cached) cacheUserInfo(null);
          }
        }
      } catch {
        // 出错时保留缓存数据作为降级
      }

      if (!cancelled) setIsLoading(false);
    };

    initAuth();

    return () => { cancelled = true; };
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

  const logout = useCallback(async () => {
    await logoutUser();
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
