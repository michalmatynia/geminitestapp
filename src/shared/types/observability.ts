export enum ErrorCategory {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  VALIDATION = 'VALIDATION',
  EXTERNAL = 'EXTERNAL',
  AI = 'AI',
  DATABASE = 'DATABASE'
}

export interface SuggestedAction {
  label: string;
  description: string;
  actionType: 'RETRY' | 'CONTACT_SUPPORT' | 'CHECK_CONFIG' | 'MIGRATE_DB' | 'REAUTHENTICATE' | 'REFRESH_PAGE' | string;
  payload?: Record<string, unknown>;
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
