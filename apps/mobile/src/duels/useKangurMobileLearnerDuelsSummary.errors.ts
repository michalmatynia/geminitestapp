import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

function getErrorFallback(error: unknown, copy: DuelCopy, fallback: { de: string; en: string; pl: string }) {
  if (error instanceof Error && error.message.trim() !== '') {
    const normalized = error.message.trim().toLowerCase();
    if (normalized !== 'failed to fetch' && !normalized.includes('networkerror')) {
      return error.message.trim();
    }
  }
  return copy(fallback);
}

export const toDuelsSummaryErrorMessage = (
  error: unknown,
  copy: DuelCopy,
): string | null => {
  if (!error) return null;

  if (typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 401) {
    return copy({
      de: 'Melde dich an, um Duellstatistiken zu laden.',
      en: 'Sign in to load duel stats.',
      pl: 'Zaloguj się, aby pobrać statystyki pojedynków.',
    });
  }

  return getErrorFallback(error, copy, {
    de: 'Die Duellstatistiken konnten nicht geladen werden.',
    en: 'Could not load duel stats.',
    pl: 'Nie udało się pobrać statystyk pojedynków.',
  });
};

export const toDuelsSummaryActionErrorMessage = (
  error: unknown,
  copy: DuelCopy,
): string => {
  if (typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 401) {
    return copy({
      de: 'Melde dich an, um ein privates Rückspiel zu senden.',
      en: 'Sign in to send a private rematch.',
      pl: 'Zaloguj się, aby wysłać prywatny rewanż.',
    });
  }

  return getErrorFallback(error, copy, {
    de: 'Das private Rückspiel konnte nicht erstellt werden.',
    en: 'Could not create the private rematch.',
    pl: 'Nie udało się utworzyć prywatnego rewanżu.',
  });
};
