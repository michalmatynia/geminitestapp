export const MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT = 8;
export const MOBILE_HOME_DUEL_LOBBY_POLL_MS = 20_000;
export type KangurMobileHomeDuelLobbyVisibility = 'private' | 'public';

export const buildKangurMobileHomeDuelLobbyQueryKey = (
  apiBaseUrl: string,
  learnerIdentity: string,
  visibility: KangurMobileHomeDuelLobbyVisibility,
) =>
  [
    'kangur-mobile',
    'home',
    'duel-lobby',
    apiBaseUrl,
    learnerIdentity,
    visibility,
  ] as const;
