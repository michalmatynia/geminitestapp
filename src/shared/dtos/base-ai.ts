import { DtoBase } from '../types/base';

/**
 * Base properties for any AI-related execution or run
 */
export interface AiRunBaseDto extends DtoBase {
  status: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Base properties for any AI-related log entry
 */
export interface AiLogBaseDto extends DtoBase {
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}
