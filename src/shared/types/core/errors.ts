import { AppErrorCodes as AppErrorCodesContract, type AppErrorCodeDto } from '../../contracts/base';

export const AppErrorCodes = AppErrorCodesContract;

export type AppErrorCode = AppErrorCodeDto;

export type AppErrorOptions = {
  code: AppErrorCode;
  httpStatus: number;
  cause?: unknown;
  meta?: Record<string, unknown> | undefined;
  expected?: boolean;
  /** Whether this error should trigger alerts/notifications */
  critical?: boolean;
  /** Retry hint for clients */
  retryable?: boolean;
  /** Suggested retry delay in milliseconds */
  retryAfterMs?: number;
};

export type ResolvedError = {
  message: string;
  code: string;
  status: number;
  details?: unknown;
};

export type MapStatusOptions = {
  defaultStatus?: number;
  fallbackCode?: string;
};

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  timestamp: string;
}

export type ClientErrorPayload = {
  message: string;
  stack?: string;
  url?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
};