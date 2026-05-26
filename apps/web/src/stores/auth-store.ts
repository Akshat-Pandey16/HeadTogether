import { create } from "zustand";
import type { TokenPair, User } from "@/types";

type AuthState = {
  user: User | null;
  tokens: TokenPair | null;
  status: "loading" | "authenticated" | "unauthenticated";
  setUser: (user: User | null) => void;
  setTokens: (tokens: TokenPair | null) => void;
  setStatus: (status: AuthState["status"]) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  status: "loading",
  setUser: (user) => set({ user }),
  setTokens: (tokens) => set({ tokens }),
  setStatus: (status) => set({ status }),
}));
