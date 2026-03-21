import * as Linking from 'expo-linking';
import { Share } from 'react-native';

type ShareKangurDuelInviteOptions = {
  sessionId: string;
  sharerDisplayName: string;
};

const toInviteShareErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Nie udało się udostępnić linku do zaproszenia.';
  }

  const message = error.message.trim();
  return message || 'Nie udało się udostępnić linku do zaproszenia.';
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
  const inviteUrl = createKangurDuelInviteUrl(options.sessionId);
  return `Dołącz do prywatnego pojedynku Kangura od ${options.sharerDisplayName}.\n${inviteUrl}`;
};

export const shareKangurDuelInvite = async (
  options: ShareKangurDuelInviteOptions,
): Promise<void> => {
  try {
    const inviteUrl = createKangurDuelInviteUrl(options.sessionId);
    const message = createKangurDuelInviteShareMessage(options);

    await Share.share({
      message,
      title: 'Zaproszenie do pojedynku Kangur',
      url: inviteUrl,
    });
  } catch (error) {
    throw new Error(toInviteShareErrorMessage(error));
  }
};
