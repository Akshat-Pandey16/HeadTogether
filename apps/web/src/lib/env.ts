const required = (key: string, value: string | undefined): string => {
  if (!value) throw new Error(`missing env: ${key}`);
  return value;
};

export const env = {
  apiBaseUrl: required("VITE_API_BASE_URL", import.meta.env.VITE_API_BASE_URL),
  wsBaseUrl: required("VITE_WS_BASE_URL", import.meta.env.VITE_WS_BASE_URL),
} as const;
