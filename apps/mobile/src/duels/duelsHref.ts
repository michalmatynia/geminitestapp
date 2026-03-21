import type { Href } from 'expo-router';

type CreateKangurDuelsHrefOptions = {
  sessionId?: string | null;
  spectate?: boolean;
};

export const createKangurDuelsHref = (
  options: CreateKangurDuelsHrefOptions = {},
): Href => {
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

  return '/duels' as Href;
};
