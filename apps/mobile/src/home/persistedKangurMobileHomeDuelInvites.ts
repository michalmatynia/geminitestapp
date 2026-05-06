import { kangurDuelLobbyEntrySchema, type KangurDuelLobbyEntry } from '@kangur/contracts/kangur-duels';
import type { KangurClientStorageAdapter } from '@kangur/platform';

import { MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT } from './homeDuelLobbyQuery';

const KANGUR_MOBILE_HOME_DUEL_INVITES_STORAGE_KEY =
  'kangur.mobile.home.duels.privateLobby';

function updateAccumulator(
    acc: Record<string, KangurDuelLobbyEntry[]>,
    key: string,
    data: KangurDuelLobbyEntry[]
): Record<string, KangurDuelLobbyEntry[]> {
    return { ...acc, [key]: data };
}

function processEntry(
  acc: Record<string, KangurDuelLobbyEntry[]>,
  [identityKey, value]: [string, unknown]
): Record<string, KangurDuelLobbyEntry[]> {
  const result = kangurDuelLobbyEntrySchema
    .array()
    .max(MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT)
    .safeParse(value);
  if (!result.success) return acc;
  return updateAccumulator(acc, identityKey, result.data);
}

function tryParseSnapshot(normalized: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

const parsePersistedHomeDuelInvitesStore = (
  rawSnapshot: string | null,
): Record<string, KangurDuelLobbyEntry[]> => {
  const normalized = rawSnapshot?.trim() ?? '';
  if (normalized === '') return {};
  
  const parsedSnapshot = tryParseSnapshot(normalized);
  if (!parsedSnapshot) return {};

  return Object.entries(parsedSnapshot).reduce<Record<string, KangurDuelLobbyEntry[]>>(
    processEntry,
    {},
  );
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
  if (learnerIdentity === '') {
    return;
  }
  const currentStore = parsePersistedHomeDuelInvitesStore(
    storage.getItem(KANGUR_MOBILE_HOME_DUEL_INVITES_STORAGE_KEY),
  );
  const updatedStore = {
    ...currentStore,
    [learnerIdentity]: entries.slice(0, MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT),
  };
  storage.setItem(
    KANGUR_MOBILE_HOME_DUEL_INVITES_STORAGE_KEY,
    JSON.stringify(updatedStore),
  );
};
