export const MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT = 8;
export const MOBILE_HOME_DUEL_LOBBY_POLL_MS = 20_000;

export const buildKangurMobileHomeDuelLobbyQueryKey = (
  apiBaseUrl: string,
  learnerIdentity: string,
) =>
  [
    'kangur-mobile',
    'home',
    'duel-lobby',
    apiBaseUrl,
    learnerIdentity,
  ] as const;
