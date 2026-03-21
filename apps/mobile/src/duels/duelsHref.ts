import type { Href } from 'expo-router';

type CreateKangurDuelsHrefOptions = {
  sessionId?: string | null;
};

export const createKangurDuelsHref = (
  options: CreateKangurDuelsHrefOptions = {},
): Href => {
  const sessionId = options.sessionId?.trim() ?? '';

  if (sessionId) {
    return ({
      pathname: '/duels',
      params: {
        sessionId,
      },
    }) as unknown as Href;
  }

  return '/duels' as Href;
};
