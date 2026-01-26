export type UserPreferencesData = {
  theme?: "light" | "dark" | "system";
  language?: string;
  notifications?: boolean;
  [key: string]: unknown;
};

export type UserPreferences = UserPreferencesData & {
  userId: string;
};

export interface ChatSessionDocument {
  id: string;
  userId: string;
  title: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
  }>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type DatabaseBackupResult = {
  success: boolean;
  filePath?: string;
  error?: string;
  timestamp: string;
  size?: number;
};

export type JsonParseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type ApiHandlerOptions = {
  requireAuth?: boolean;
  roles?: string[];
  validateBody?: boolean;
  validateQuery?: boolean;
};

export type ApiHandlerContext = {
  params: Record<string, string>;
  searchParams: URLSearchParams;
  user?: {
    id: string;
    email: string;
    role: string;
  };
};

export type ApiRouteHandler = (
  req: Request,
  context: ApiHandlerContext
) => Promise<Response>;

export type ApiRouteHandlerWithParams<P extends Record<string, string>> = (
  req: Request,
  context: ApiHandlerContext & { params: P }
) => Promise<Response>;

export type RetryOptions = {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  retryOn?: (error: unknown) => boolean;
};

export type CircuitBreakerOptions = {
  failureThreshold: number;
  recoveryTimeout: number;
  monitorInterval: number;
};

export type TransientRecoveryOptions = {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
};

export type CountryCode = string;
export type CurrencyCode = string;
export type LanguageCode = string;

export type ClientLoggingSettings = {
  enabled: boolean;
  level: "info" | "warn" | "error" | "debug";
  endpoint: string;
};

export type TransientRecoverySettings = {
  enabled: boolean;
  options: TransientRecoveryOptions;
};
