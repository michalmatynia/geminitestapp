import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { getStoredActiveLearnerId } from '@/features/kangur/services/kangur-active-learner';
import { isKangurStatusError } from '@/features/kangur/services/status-errors';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

import { KANGUR_ACTIVE_LEARNER_HEADER } from './local-kangur-platform-endpoints';

const toErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : 'Unknown error';

export const createActorAwareHeaders = (headers?: HeadersInit): Headers => {
  const nextHeaders = withCsrfHeaders(headers);
  const activeLearnerId = getStoredActiveLearnerId();
  if (activeLearnerId && !nextHeaders.has(KANGUR_ACTIVE_LEARNER_HEADER)) {
    nextHeaders.set(KANGUR_ACTIVE_LEARNER_HEADER, activeLearnerId);
  }
  return nextHeaders;
};

export const trackWriteSuccess = (action: string, context: Record<string, unknown> = {}): void => {
  trackKangurClientEvent('kangur_api_write_succeeded', {
    action,
    ...context,
  });
};

export const trackWriteFailure = (
  action: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void => {
  trackKangurClientEvent('kangur_api_write_failed', {
    action,
    errorMessage: toErrorMessage(error),
    ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    ...context,
  });
};

export const trackReadFailure = (
  action: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void => {
  trackKangurClientEvent('kangur_api_read_failed', {
    action,
    errorMessage: toErrorMessage(error),
    ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    ...context,
  });
};
