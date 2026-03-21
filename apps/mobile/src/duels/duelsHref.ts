import type { Href } from 'expo-router';

type CreateKangurDuelsHrefOptions = {
  joinSessionId?: string | null;
  sessionId?: string | null;
  spectate?: boolean;
};

export const createKangurDuelsHref = (
  options: CreateKangurDuelsHrefOptions = {},
): Href => {
  const joinSessionId = options.joinSessionId?.trim() ?? '';
  const sessionId = options.sessionId?.trim() ?? '';
  const spectate = options.spectate === true;

  if (sessionId) {
    return ({
      pathname: '/duels',
      params: {
        sessionId,
        ...(spectate ? { spectate: '1' } : {}),
      },
    }) as unknown as Href;
  }

  if (joinSessionId) {
    return ({
      pathname: '/duels',
      params: {
        join: joinSessionId,
      },
    }) as unknown as Href;
  }

  return '/duels' as Href;
};
