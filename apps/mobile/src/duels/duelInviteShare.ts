import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

type ShareKangurDuelInviteOptions = {
  locale?: KangurMobileLocale;
  sessionId: string;
  sharerDisplayName: string;
};

const getInviteShareLocalizedCopy = (
  locale: KangurMobileLocale,
): {
  inviteTitle: string;
  inviteUnavailable: string;
  inviteMessage: (sharerDisplayName: string) => string;
} => {
  switch (locale) {
    case 'de':
      return {
        inviteTitle: 'Kangur-Duell-Einladung',
        inviteUnavailable: 'Der Einladungslink konnte nicht geteilt werden.',
        inviteMessage: (sharerDisplayName) =>
          `Tritt dem privaten Kangur-Duell von ${sharerDisplayName} bei.`,
      };
    case 'en':
      return {
        inviteTitle: 'Kangur duel invite',
        inviteUnavailable: 'Could not share the invite link.',
        inviteMessage: (sharerDisplayName) =>
          `Join the private Kangur duel from ${sharerDisplayName}.`,
      };
    case 'pl':
    default:
      return {
        inviteTitle: 'Zaproszenie do pojedynku Kangur',
        inviteUnavailable: 'Nie udało się udostępnić linku do zaproszenia.',
        inviteMessage: (sharerDisplayName) =>
          `Dołącz do prywatnego pojedynku Kangura od ${sharerDisplayName}.`,
      };
  }
};

const toInviteShareErrorMessage = (
  error: unknown,
  locale: KangurMobileLocale,
): string => {
  const { inviteUnavailable } = getInviteShareLocalizedCopy(locale);

  if (!(error instanceof Error)) {
    return inviteUnavailable;
  }

  const message = error.message.trim();
  return message !== '' ? message : inviteUnavailable;
};

export const createKangurDuelInviteUrl = (sessionId: string): string =>
  Linking.createURL('/duels', {
    queryParams: {
      join: sessionId.trim(),
    },
  });

export const createKangurDuelInviteShareMessage = (
  options: ShareKangurDuelInviteOptions,
): string => {
  const locale = options.locale ?? 'pl';
  const inviteUrl = createKangurDuelInviteUrl(options.sessionId);
  const { inviteMessage } = getInviteShareLocalizedCopy(locale);

  return `${inviteMessage(options.sharerDisplayName)}\n${inviteUrl}`;
};

export const shareKangurDuelInvite = async (
  options: ShareKangurDuelInviteOptions,
): Promise<void> => {
  const locale = options.locale ?? 'pl';

  try {
    const inviteUrl = createKangurDuelInviteUrl(options.sessionId);
    const message = createKangurDuelInviteShareMessage(options);
    const { inviteTitle } = getInviteShareLocalizedCopy(locale);

    await Share.share({
      message,
      title: inviteTitle,
      url: inviteUrl,
    });
  } catch (error) {
    throw new Error(toInviteShareErrorMessage(error, locale));
  }
};
