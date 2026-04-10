import 'server-only';

import type { AppError } from '@/shared/errors/app-error';

import type { PlaywrightImportResult } from './programmable';
import {
  createPlaywrightInstanceTaskInternalError,
  runPlaywrightInstanceTask,
  withPlaywrightInstanceTaskErrorMeta,
  type RunPlaywrightInstanceTaskInput,
} from './instance-task';

export type RunPlaywrightImportTaskInput<
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
> = RunPlaywrightInstanceTaskInput<PlaywrightImportResult, TResult, TErrorAdditional>;

export const withPlaywrightImportTaskErrorMeta = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  error: AppError,
  additional?: TAdditional
): AppError => withPlaywrightInstanceTaskErrorMeta<TAdditional>(error, additional);

export const createPlaywrightImportTaskInternalError = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  message: string,
  additional?: TAdditional
): AppError => createPlaywrightInstanceTaskInternalError<TAdditional>(message, additional);

export const runPlaywrightImportTask = async <
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  input: RunPlaywrightImportTaskInput<TResult, TErrorAdditional>
): Promise<TResult> =>
  runPlaywrightInstanceTask({
    ...input,
    getErrorMessage:
      input.getErrorMessage ??
      ((error) =>
        error instanceof Error ? error.message : 'Playwright import task failed'),
  });
