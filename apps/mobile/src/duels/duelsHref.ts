import type { Href } from 'expo-router';

type CreateKangurDuelsHrefOptions = {
  joinSessionId?: string | null;
  sessionId?: string | null;
  spectate?: boolean;
};

function createSessionHref(sessionId: string, spectate: boolean | undefined): Href {
  return ({
    pathname: '/duels',
    params: {
      sessionId,
      ...(spectate === true ? { spectate: '1' } : {}),
    },
  }) as unknown as Href;
}

function createJoinHref(joinSessionId: string): Href {
  return ({
    pathname: '/duels',
    params: {
      join: joinSessionId,
    },
  }) as unknown as Href;
}

export const createKangurDuelsHref = (
  options: CreateKangurDuelsHrefOptions = {},
): Href => {
  const joinSessionId = options.joinSessionId?.trim() ?? '';
  const sessionId = options.sessionId?.trim() ?? '';

  if (sessionId !== '') {
    return createSessionHref(sessionId, options.spectate);
  }

  if (joinSessionId !== '') {
    return createJoinHref(joinSessionId);
  }

  return '/duels' as Href;
};
