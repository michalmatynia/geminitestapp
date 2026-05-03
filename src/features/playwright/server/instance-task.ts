import 'server-only';

import { internalError, isAppError, type AppError } from '@/shared/errors/app-error';

export type RunPlaywrightInstanceTaskInput<
  TPlaywrightResult,
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
> = {
  execute: () => Promise<TPlaywrightResult>;
  mapResult: (result: TPlaywrightResult) => Promise<TResult> | TResult;
  buildErrorAdditional?: (
    input: {
      error: unknown;
    }
  ) => Promise<TErrorAdditional | void> | TErrorAdditional | void;
  getErrorMessage?: (error: unknown) => string;
};

export const withPlaywrightInstanceTaskErrorMeta = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  error: AppError,
  additional?: TAdditional
): AppError => error.withMeta(additional ?? ({} as TAdditional));

export const createPlaywrightInstanceTaskInternalError = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  message: string,
  additional?: TAdditional
): AppError => internalError(message, additional);

export const runPlaywrightInstanceTask = async <
  TPlaywrightResult,
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  input: RunPlaywrightInstanceTaskInput<TPlaywrightResult, TResult, TErrorAdditional>
): Promise<TResult> => {
  try {
    const result = await input.execute();
    return await input.mapResult(result);
  } catch (error: unknown) {
    const errorAdditional =
      (await input.buildErrorAdditional?.({
        error,
      })) ?? ({} as TErrorAdditional);

    if (isAppError(error)) {
      throw withPlaywrightInstanceTaskErrorMeta(error, errorAdditional);
    }

    if (error instanceof Error) {
      const metadataCarrier = error as Error & { meta?: Record<string, unknown> };
      metadataCarrier.meta = {
        ...(metadataCarrier.meta ?? {}),
        ...(errorAdditional as Record<string, unknown>),
      };
      throw metadataCarrier;
    }

    const internalErrorAdditional = {
      ...(errorAdditional as Record<string, unknown>),
      cause: error,
    };

    throw createPlaywrightInstanceTaskInternalError(
      input.getErrorMessage?.(error) ??
        (error instanceof Error ? error.message : 'Playwright instance task failed'),
      internalErrorAdditional
    );
  }
};
