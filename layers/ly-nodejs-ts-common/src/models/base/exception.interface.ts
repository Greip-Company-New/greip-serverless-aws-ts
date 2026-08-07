export interface ExceptionOptions {
  code?: string | number;
  httpCode?: number;
  messages?: string | string[];
  error?: any | null; // el error original (por ejemplo, Error, AxiosError, etc.)
}