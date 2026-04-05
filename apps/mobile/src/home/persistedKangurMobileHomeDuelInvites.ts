import { kangurDuelLobbyEntrySchema, type KangurDuelLobbyEntry } from '@kangur/contracts/kangur-duels';
import type { KangurClientStorageAdapter } from '@kangur/platform';

import { MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT } from './homeDuelLobbyQuery';

const KANGUR_MOBILE_HOME_DUEL_INVITES_STORAGE_KEY =
  'kangur.mobile.home.duels.privateLobby';

const parsePersistedHomeDuelInvitesStore = (
  rawSnapshot: string | null,
): Record<string, KangurDuelLobbyEntry[]> => {
  const normalizedRawSnapshot = rawSnapshot?.trim() ?? '';
  if (!normalizedRawSnapshot) {
    return {};
  }

  try {
    const parsedSnapshot = JSON.parse(normalizedRawSnapshot) as unknown;
    if (
      !parsedSnapshot ||
      typeof parsedSnapshot !== 'object' ||
      Array.isArray(parsedSnapshot)
    ) {
      return {};
    }

    return Object.entries(parsedSnapshot).reduce<Record<string, KangurDuelLobbyEntry[]>>(
      (snapshot, [identityKey, value]) => {
        const parsedEntries = kangurDuelLobbyEntrySchema
          .array()
          .max(MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT)
          .safeParse(value);
        if (parsedEntries.success) {
          snapshot[identityKey] = parsedEntries.data;
        }
        return snapshot;
      },
      {},
    );
  } catch {
    return {};
  }
};

export const resolvePersistedKangurMobileHomeDuelInvites = ({
  learnerIdentity,
  storage,
}: {
  learnerIdentity: string;
  storage: KangurClientStorageAdapter;
}): KangurDuelLobbyEntry[] | null => {
  const store = parsePersistedHomeDuelInvitesStore(
    storage.getItem(KANGUR_MOBILE_HOME_DUEL_INVITES_STORAGE_KEY),
  );
  return store[learnerIdentity] ?? null;
};

export const persistKangurMobileHomeDuelInvites = ({
  entries,
  learnerIdentity,
  storage,
}: {
  entries: KangurDuelLobbyEntry[];
  learnerIdentity: string;
  storage: KangurClientStorageAdapter;
}): void => {
  const store = parsePersistedHomeDuelInvitesStore(
    storage.getItem(KANGUR_MOBILE_HOME_DUEL_INVITES_STORAGE_KEY),
  );
  store[learnerIdentity] = entries.slice(0, MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT);
  storage.setItem(
    KANGUR_MOBILE_HOME_DUEL_INVITES_STORAGE_KEY,
    JSON.stringify(store),
  );
};
