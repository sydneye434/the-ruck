export type ApiError = {
  message: string;
  code?: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
  meta?: Record<string, unknown>;
};

