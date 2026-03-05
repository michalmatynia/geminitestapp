'use client';

import {
  logClientError,
  setClientErrorBaseContext,
} from '@/shared/utils/observability/client-error-logger';

type KangurClientErrorContext = Record<string, unknown>;

const KANGUR_CLIENT_CONTEXT = Object.freeze({
  feature: 'kangur',
  service: 'kangur.client',
});

export const logKangurClientError = (
  error: unknown,
  context: KangurClientErrorContext = {}
): void => {
  logClientError(error, {
    context: {
      ...KANGUR_CLIENT_CONTEXT,
      ...context,
    },
  });
};

export const setKangurClientObservabilityContext = (context: {
  pageKey: string | null;
  requestedPath: string;
}): void => {
  setClientErrorBaseContext({
    feature: 'kangur',
    kangur: {
      pageKey: context.pageKey,
      requestedPath: context.requestedPath,
    },
  });
};

export const clearKangurClientObservabilityContext = (): void => {
  setClientErrorBaseContext({
    kangur: null,
  });
};
