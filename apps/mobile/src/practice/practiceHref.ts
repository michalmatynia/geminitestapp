import type { Href } from 'expo-router';

export const createKangurPracticeHref = (operation: string): Href =>
  ({
    pathname: '/practice',
    params: {
      operation,
    },
  }) as unknown as Href;
