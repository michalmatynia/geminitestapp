export enum ErrorCategory {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  VALIDATION = 'VALIDATION',
  EXTERNAL = 'EXTERNAL',
  AI = 'AI',
  DATABASE = 'DATABASE'
}

export interface ErrorContext {
  service?: string | null | undefined;
  runId?: string | null | undefined;
  jobId?: string | null | undefined;
  productId?: string | null | undefined;
  errorId?: string | null | undefined;
  category?: ErrorCategory | string | null | undefined;
  userMessage?: string | null | undefined;
  [key: string]: unknown;
}
