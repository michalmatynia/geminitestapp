import type { Href } from 'expo-router';

export const createKangurCompetitionHref = (mode?: string | null): Href => {
  const trimmedMode = mode?.trim();
  if (!trimmedMode) {
    return '/competition' as Href;
  }

  return ({
    pathname: '/competition',
    params: {
      mode: trimmedMode,
    },
  }) as unknown as Href;
};
