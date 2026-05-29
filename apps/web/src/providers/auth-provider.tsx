import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { authApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { LoginPayload, RegisterPayload, TokenPair, User } from "@/types";

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const status = useAuthStore((s) => s.status);
  return { user, tokens, status, isAuthenticated: status === "authenticated" };
};

export const useAuthActions = () => {
  const queryClient = useQueryClient();

  const finalize = async (tokens: TokenPair): Promise<User> => {
    apiClient.setTokens(tokens);
    useAuthStore.setState({ tokens });
    const me = await usersApi.me();
    useAuthStore.setState({ user: me, status: "authenticated" });
    return me;
  };

  const login = async (payload: LoginPayload) => {
    const tokens = await authApi.login(payload);
    return finalize(tokens);
  };

  const register = async (payload: RegisterPayload) => {
    await authApi.register(payload);
    return login({ username: payload.email, password: payload.password });
  };

  const logout = async () => {
    const current = apiClient.getTokens();
    if (current) {
      try {
        await authApi.logout(current.refresh_token);
      } catch {
        void 0;
      }
    }
    apiClient.setTokens(null);
    useAuthStore.setState({ user: null, tokens: null, status: "unauthenticated" });
    queryClient.clear();
  };

  return { login, register, logout };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const unsubscribe = apiClient.onAuthChange((next) => {
      useAuthStore.setState({ tokens: next });
      if (next === null) {
        useAuthStore.setState({ user: null, status: "unauthenticated" });
      }
    });
    const bootstrap = async () => {
      const stored = apiClient.getTokens();
      if (!stored) {
        useAuthStore.setState({ status: "unauthenticated" });
        return;
      }
      useAuthStore.setState({ tokens: stored });
      try {
        const me = await usersApi.me();
        useAuthStore.setState({ user: me, status: "authenticated" });
      } catch {
        apiClient.setTokens(null);
        useAuthStore.setState({ user: null, tokens: null, status: "unauthenticated" });
      }
    };
    void bootstrap();
    return unsubscribe;
  }, []);

  return children;
};
