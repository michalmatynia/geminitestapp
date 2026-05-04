import {
  kangurDuelLobbyPresenceEntrySchema,
  type KangurDuelLobbyPresenceEntry,
} from '@kangur/contracts/kangur-duels';
import type { KangurClientStorageAdapter } from '@kangur/platform';

import { MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT } from './homeDuelLobbyQuery';

const KANGUR_MOBILE_HOME_DUEL_PRESENCE_STORAGE_KEY =
  'kangur.mobile.home.duels.presence';

const isPersistedHomeDuelPresenceStore = (
  rawSnapshot: unknown,
): rawSnapshot is Record<string, unknown> => {
  if (rawSnapshot === null || rawSnapshot === undefined) {
    return false;
  }
  if (typeof rawSnapshot !== 'object') {
    return false;
  }
  return !Array.isArray(rawSnapshot);
};

const parsePresenceEntries = (
  value: unknown,
): KangurDuelLobbyPresenceEntry[] | null => {
  const parsed = kangurDuelLobbyPresenceEntrySchema.array().max(
    MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT,
  ).safeParse(value);
  return parsed.success ? parsed.data : null;
};

const parsePersistedHomeDuelPresenceStore = (
  rawSnapshot: string | null,
): Record<string, KangurDuelLobbyPresenceEntry[]> => {
  const normalizedRawSnapshot = rawSnapshot?.trim() ?? '';
  if (normalizedRawSnapshot.length === 0) {
    return {};
  }

  let parsedSnapshot: unknown;
  try {
    parsedSnapshot = JSON.parse(normalizedRawSnapshot);
  } catch {
    return {};
  }
  if (!isPersistedHomeDuelPresenceStore(parsedSnapshot)) {
    return {};
  }

  const parsedStore: Record<string, KangurDuelLobbyPresenceEntry[]> = {};
  for (const [identityKey, value] of Object.entries(parsedSnapshot)) {
    const parsedEntries = parsePresenceEntries(value);
    if (parsedEntries === null) {
      continue;
    }
    parsedStore[identityKey] = parsedEntries;
  }

  return parsedStore;
};

export const resolvePersistedKangurMobileHomeDuelPresence = ({
  learnerIdentity,
  storage,
}: {
  learnerIdentity: string;
  storage: KangurClientStorageAdapter;
}): KangurDuelLobbyPresenceEntry[] | null => {
  const store = parsePersistedHomeDuelPresenceStore(
    storage.getItem(KANGUR_MOBILE_HOME_DUEL_PRESENCE_STORAGE_KEY),
  );
  return store[learnerIdentity] ?? null;
};

export const persistKangurMobileHomeDuelPresence = ({
  entries,
  learnerIdentity,
  storage,
}: {
  entries: KangurDuelLobbyPresenceEntry[];
  learnerIdentity: string;
  storage: KangurClientStorageAdapter;
}): void => {
  if (learnerIdentity.length === 0) {
    return;
  }

  const currentStore = parsePersistedHomeDuelPresenceStore(
    storage.getItem(KANGUR_MOBILE_HOME_DUEL_PRESENCE_STORAGE_KEY),
  );
  const updatedStore = {
    ...currentStore,
    [learnerIdentity]: entries.slice(0, MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT),
  };
  storage.setItem(
    KANGUR_MOBILE_HOME_DUEL_PRESENCE_STORAGE_KEY,
    JSON.stringify(updatedStore),
  );
};
