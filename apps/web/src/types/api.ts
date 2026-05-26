export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type GenericMessage = { message: string };

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type UnreadCountResponse = { count: number };
