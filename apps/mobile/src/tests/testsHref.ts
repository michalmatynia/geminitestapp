import type { Href } from 'expo-router';

export const createKangurTestsHref = (focus?: string | null): Href => {
  const trimmedFocus = focus?.trim();
  if (!trimmedFocus) {
    return '/tests' as Href;
  }

  return ({
    pathname: '/tests',
    params: {
      focus: trimmedFocus,
    },
  }) as unknown as Href;
};
