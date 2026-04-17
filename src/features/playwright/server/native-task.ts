import 'server-only';

import type { BrowserListingResultDto } from '@/shared/contracts/integrations/listings';
import { internalError, type AppError } from '@/shared/errors/app-error';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';

import {
  buildPlaywrightNativeTaskMetadata,
  openPlaywrightConnectionNativeTaskSession,
  type OpenPlaywrightConnectionNativeTaskSessionInput,
  type OpenPlaywrightConnectionNativeTaskSessionResult,
} from './browser-session';
import { runPlaywrightInstanceTask } from './instance-task';
import { buildPlaywrightListingResult } from './listing-result';

type PlaywrightNativeTaskSessionSummary = Pick<
  OpenPlaywrightConnectionNativeTaskSessionResult,
  | 'sessionMetadata'
  | 'effectiveBrowserMode'
  | 'effectiveBrowserPreference'
  | 'requestedBrowserMode'
  | 'requestedBrowserPreference'
>;

export type BuildPlaywrightNativeTaskResultInput<
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
> = {
  session: PlaywrightNativeTaskSessionSummary;
  externalListingId: string | null;
  listingUrl?: string | null;
  completedAt?: string | null;
  simulated?: boolean;
  metadata?: TAdditional;
};

export type RunPlaywrightConnectionNativeTaskInput<
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
> = OpenPlaywrightConnectionNativeTaskSessionInput & {
  runtimeActionKey?: ActionSequenceKey;
  execute: (session: OpenPlaywrightConnectionNativeTaskSessionResult) => Promise<TResult>;
  buildErrorAdditional?: (input: {
    error: unknown;
    session: OpenPlaywrightConnectionNativeTaskSessionResult;
  }) => Promise<TErrorAdditional | void> | TErrorAdditional | void;
  getErrorMessage?: (error: unknown) => string;
};

export const buildPlaywrightNativeTaskResult = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  input: BuildPlaywrightNativeTaskResultInput<TAdditional>
): BrowserListingResultDto =>
  buildPlaywrightListingResult({
    externalListingId: input.externalListingId,
    ...(input.listingUrl ? { listingUrl: input.listingUrl } : {}),
    ...(input.completedAt ? { completedAt: input.completedAt } : {}),
    ...(typeof input.simulated === 'boolean' ? { simulated: input.simulated } : {}),
    metadata: buildPlaywrightNativeTaskMetadata({
      session: input.session,
      additional: input.metadata,
    }),
  });

export const buildPlaywrightNativeTaskErrorMeta = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(input: {
  session: PlaywrightNativeTaskSessionSummary;
  additional?: TAdditional;
}): Record<string, unknown> =>
  buildPlaywrightNativeTaskMetadata({
    session: input.session,
    additional: input.additional,
  });

export const withPlaywrightNativeTaskErrorMeta = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  error: AppError,
  input: {
    session: PlaywrightNativeTaskSessionSummary;
    additional?: TAdditional;
  }
): AppError =>
  error.withMeta(buildPlaywrightNativeTaskErrorMeta(input));

export const createPlaywrightNativeTaskInternalError = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  message: string,
  input: {
    session: PlaywrightNativeTaskSessionSummary;
    additional?: TAdditional;
  }
): AppError =>
  internalError(message, buildPlaywrightNativeTaskErrorMeta(input));

export const runPlaywrightConnectionNativeTask = async <
  TResult,
  TErrorAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  input: RunPlaywrightConnectionNativeTaskInput<TResult, TErrorAdditional>
): Promise<TResult> => {
  const session = await openPlaywrightConnectionNativeTaskSession({
    connection: input.connection,
    instance: input.instance,
    runtimeActionKey: input.runtimeActionKey,
    requestedBrowserMode: input.requestedBrowserMode,
    requestedBrowserPreference: input.requestedBrowserPreference,
    viewport: input.viewport,
  });

  try {
    return await runPlaywrightInstanceTask({
      execute: async () => input.execute(session),
      mapResult: async (result) => result,
      buildErrorAdditional: async ({ error }) =>
        buildPlaywrightNativeTaskErrorMeta({
          session,
          additional:
            (await input.buildErrorAdditional?.({
              error,
              session,
            })) ?? ({} as TErrorAdditional),
        }),
      getErrorMessage:
        input.getErrorMessage ??
        ((error) =>
          error instanceof Error ? error.message : 'Native browser task failed'),
    });
  } finally {
    await session.close();
  }
};
