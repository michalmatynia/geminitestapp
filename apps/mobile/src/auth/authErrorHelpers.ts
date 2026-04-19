import { KANGUR_MOBILE_AUTH_ERROR_CODES } from './createLearnerSessionKangurAuthAdapter';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

export const resolveAuthErrorCode = (error: unknown): string | null =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof (error as { code: unknown }).code === 'string'
    ? (error as { code: string }).code
    : null;

export const toAuthErrorMessage = (
  error: unknown,
  locale: KangurMobileLocale,
): string => {
  if (!(error instanceof Error)) {
    return {
      de: 'Die Anmeldung konnte nicht aktualisiert werden.',
      en: 'Could not refresh sign-in.',
      pl: 'Nie udało się odświeżyć logowania.',
    }[locale];
  }

  const message = error.message.trim();
  const errorCode = resolveAuthErrorCode(error);
  if (message.length === 0) {
    return {
      de: 'Die Anmeldung konnte nicht aktualisiert werden.',
      en: 'Could not refresh sign-in.',
      pl: 'Nie udało się odświeżyć logowania.',
    }[locale];
  }

  if (errorCode === KANGUR_MOBILE_AUTH_ERROR_CODES.missingCredentials) {
    return {
      de: 'Gib den Lernenden-Login und das Passwort ein, um dich anzumelden.',
      en: 'Enter the learner login and password to sign in.',
      pl: 'Podaj login i hasło ucznia, aby się zalogować.',
    }[locale];
  }

  if (errorCode === KANGUR_MOBILE_AUTH_ERROR_CODES.missingPersistedSession) {
    return {
      de: 'Die Anmeldung konnte auf diesem Gerät nicht gespeichert werden. Prüfe Cookie- und Login-Unterstützung der aktuellen Laufzeit.',
      en: 'Sign-in could not be saved on this device. Check cookie and sign-in support for the current runtime.',
      pl: 'Logowanie nie zostało zapisane na tym urządzeniu. Sprawdź obsługę cookies i logowania w aktualnym środowisku.',
    }[locale];
  }

  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage === 'failed to fetch' || normalizedMessage.includes('networkerror')) {
    return {
      de: 'Die Verbindung zur Kangur-API konnte nicht hergestellt werden.',
      en: 'Could not connect to the Kangur API.',
      pl: 'Nie udało się połączyć z API Kangura.',
    }[locale];
  }

  return message;
};
