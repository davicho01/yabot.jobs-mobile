import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi } from "../api/auth";
import { clearToken, loadToken, saveToken, setUnauthorizedHandler } from "../api/client";
import type { User } from "../api/types";
import { registerForPush, unregisterPush } from "../push";

interface AuthState {
  user: User | null;
  // True until the stored token (if any) has been checked against /auth/me.
  loading: boolean;
  requestCode: (email: string) => Promise<void>;
  signInWithCode: (email: string, code: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const signOut = useCallback(async () => {
    await unregisterPush();
    await clearToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signedIn = !!user;
  useEffect(() => {
    if (signedIn) void registerForPush();
  }, [signedIn]);

  useEffect(() => {
    (async () => {
      try {
        if (await loadToken()) setUser(await authApi.me());
      } catch {
        // 401 already cleared the token via the handler; a network error
        // leaves it for the next launch and shows the sign-in screen.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      setUser,
      signOut,
      requestCode: async (email) => {
        await authApi.requestCode(email);
      },
      signInWithCode: async (email, code) => {
        const result = await authApi.verifyCode(email, code);
        await saveToken(result.token);
        setUser(result.user);
      },
      signInWithGoogle: async (idToken) => {
        const result = await authApi.google(idToken);
        await saveToken(result.token);
        setUser(result.user);
      },
    }),
    [user, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
