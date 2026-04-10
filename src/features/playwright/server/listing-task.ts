import 'server-only';

import type { AppError } from '@/shared/errors/app-error';

import type { PlaywrightListingResult } from './programmable';
import {
  createPlaywrightInstanceTaskInternalError,
  runPlaywrightInstanceTask,
  withPlaywrightInstanceTaskErrorMeta,
  type RunPlaywrightInstanceTaskInput,
} from './instance-task';

export type RunPlaywrightListingTaskInput<
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
> = RunPlaywrightInstanceTaskInput<PlaywrightListingResult, TResult, TErrorAdditional>;

export const withPlaywrightListingTaskErrorMeta = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  error: AppError,
  additional?: TAdditional
): AppError => withPlaywrightInstanceTaskErrorMeta<TAdditional>(error, additional);

export const createPlaywrightListingTaskInternalError = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  message: string,
  additional?: TAdditional
): AppError => createPlaywrightInstanceTaskInternalError<TAdditional>(message, additional);

export const runPlaywrightListingTask = async <
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  input: RunPlaywrightListingTaskInput<TResult, TErrorAdditional>
): Promise<TResult> =>
  runPlaywrightInstanceTask({
    ...input,
    getErrorMessage:
      input.getErrorMessage ??
      ((error) =>
        error instanceof Error ? error.message : 'Playwright listing task failed'),
  });
