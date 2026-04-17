const KANGUR_API_PREFIX = '/api/kangur';
const KANGUR_BROWSER_API_PREFIX = '/kangur-api';

export const resolveKangurClientEndpoint = (endpoint: string): string => {
  if (!endpoint.startsWith(KANGUR_API_PREFIX)) {
    return endpoint;
  }

  return `${KANGUR_BROWSER_API_PREFIX}${endpoint.slice(KANGUR_API_PREFIX.length)}`;
};
