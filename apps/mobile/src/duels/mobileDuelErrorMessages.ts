import type { KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

type MobileStringCopy = (value: KangurMobileLocalizedValue<string>) => string;

type ResolveMobileDuelErrorMessageArgs = {
  error: unknown;
  copy: MobileStringCopy;
  fallback: KangurMobileLocalizedValue<string>;
  unauthorized?: KangurMobileLocalizedValue<string>;
  unauthorizedStatuses?: number[];
};

const readErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || !error || !('status' in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
};

const readErrorMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : null;
};

const isFallbackNetworkMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized === 'failed to fetch' || normalized.includes('networkerror');
};

import { isPresent, isStringNotEmpty } from './utils/duels-guards';

// ... (other code)

export const resolveMobileDuelErrorMessage = ({
  error,
  copy,
  fallback,
  unauthorized,
  unauthorizedStatuses = [401],
}: ResolveMobileDuelErrorMessageArgs): string | null => {
  if (!isPresent(error)) {
    return null;
  }

  const status = readErrorStatus(error);
  if (
    isPresent(unauthorized) &&
    status !== null &&
    unauthorizedStatuses.includes(status)
  ) {
    return copy(unauthorized);
  }

  const message = readErrorMessage(error);
  if (!isStringNotEmpty(message) || isFallbackNetworkMessage(message)) {
    return copy(fallback);
  }

  return message;
};
