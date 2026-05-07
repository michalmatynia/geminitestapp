import 'server-only';

import { isAppError } from '@/shared/errors/app-error';

export const isFatalJobBoardError = (error: unknown): boolean =>
  isAppError(error) && error.critical && !error.retryable;
