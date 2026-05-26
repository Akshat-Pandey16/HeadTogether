import type { TokenPair } from "@/types";

const STORAGE_KEY = "ht:tokens";

export const tokenStorage = {
  load(): TokenPair | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TokenPair;
      if (!parsed?.access_token || !parsed?.refresh_token) return null;
      return parsed;
    } catch {
      return null;
    }
  },
  save(pair: TokenPair) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pair));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
