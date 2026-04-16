import 'server-only';

import type { AppError } from '@/shared/errors/app-error';

import type { PlaywrightScrapeResult } from './scrape';
import {
  createPlaywrightInstanceTaskInternalError,
  runPlaywrightInstanceTask,
  withPlaywrightInstanceTaskErrorMeta,
  type RunPlaywrightInstanceTaskInput,
} from './instance-task';

export type RunPlaywrightScrapeTaskInput<
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
> = RunPlaywrightInstanceTaskInput<PlaywrightScrapeResult, TResult, TErrorAdditional>;

export const withPlaywrightScrapeTaskErrorMeta = (
  error: AppError,
  additional?: Record<string, unknown>
): AppError => withPlaywrightInstanceTaskErrorMeta(error, additional);

export const createPlaywrightScrapeTaskInternalError = (
  message: string,
  additional?: Record<string, unknown>
): AppError => createPlaywrightInstanceTaskInternalError(message, additional);

export const runPlaywrightScrapeTask = async <
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  input: RunPlaywrightScrapeTaskInput<TResult, TErrorAdditional>
): Promise<TResult> =>
  runPlaywrightInstanceTask({
    ...input,
    getErrorMessage:
      input.getErrorMessage ??
      ((error) =>
        error instanceof Error ? error.message : 'Playwright scrape task failed'),
  });
