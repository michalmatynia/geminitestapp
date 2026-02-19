import type {
  ErrorCategoryDto,
  SuggestedActionDto,
  ErrorContextDto,
} from '../contracts/observability';

export type ErrorCategory = ErrorCategoryDto;
export const ERROR_CATEGORY = {
  SYSTEM: 'SYSTEM',
  USER: 'USER',
  VALIDATION: 'VALIDATION',
  EXTERNAL: 'EXTERNAL',
  AI: 'AI',
  DATABASE: 'DATABASE',
} as const;

export type SuggestedAction = SuggestedActionDto;

export type ErrorContext = ErrorContextDto;
