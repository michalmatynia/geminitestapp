import {
  type KangurMobileLocalizedValue,
} from '../i18n/kangurMobileI18n';

export const readSessionErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || !error || !('status' in error)) {
    return null;
  }

  return typeof (error as { status?: unknown }).status === 'number'
    ? ((error as { status: number }).status)
    : null;
};

export const readSessionErrorMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : null;
};

export const isFallbackSessionErrorMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized === 'failed to fetch' || normalized.includes('networkerror');
};

export const getUnauthorizedSessionErrorMessage = (
  copy: (value: KangurMobileLocalizedValue<string>) => string,
): string =>
  copy({
    de: 'Melde dich an, um dieses Duell zu öffnen.',
    en: 'Sign in to open this duel.',
    pl: 'Zaloguj się, aby otworzyć ten pojedynek.',
  });

export const resolveSessionMessageWithFallback = (
  message: string | null,
  fallback: string,
): string => {
  if (message === null || message === '' || isFallbackSessionErrorMessage(message)) {
    return fallback;
  }

  return message;
};

export const toSessionErrorMessage = (
  error: unknown,
  fallback: string,
  copy: (value: KangurMobileLocalizedValue<string>) => string,
): string | null => {
  if (error === null || error === undefined) {
    return null;
  }

  if (readSessionErrorStatus(error) === 401) {
    return getUnauthorizedSessionErrorMessage(copy);
  }

  return resolveSessionMessageWithFallback(readSessionErrorMessage(error), fallback);
};
