import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

export const toDuelsSummaryErrorMessage = (
  error: unknown,
  copy: DuelCopy,
): string | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde dich an, um Duellstatistiken zu laden.',
        en: 'Sign in to load duel stats.',
        pl: 'Zaloguj się, aby pobrać statystyki pojedynków.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Die Duellstatistiken konnten nicht geladen werden.',
      en: 'Could not load duel stats.',
      pl: 'Nie udało się pobrać statystyk pojedynków.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Die Duellstatistiken konnten nicht geladen werden.',
      en: 'Could not load duel stats.',
      pl: 'Nie udało się pobrać statystyk pojedynków.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die Duellstatistiken konnten nicht geladen werden.',
      en: 'Could not load duel stats.',
      pl: 'Nie udało się pobrać statystyk pojedynków.',
    });
  }

  return message;
};

export const toDuelsSummaryActionErrorMessage = (
  error: unknown,
  copy: DuelCopy,
): string => {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde dich an, um ein privates Rückspiel zu senden.',
        en: 'Sign in to send a private rematch.',
        pl: 'Zaloguj się, aby wysłać prywatny rewanż.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Das private Rückspiel konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Das private Rückspiel konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Das private Rückspiel konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  return message;
};
