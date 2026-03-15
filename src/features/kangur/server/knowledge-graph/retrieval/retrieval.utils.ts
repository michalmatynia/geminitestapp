import { ROUTE_TO_PAGE_KEY } from './retrieval.contracts';

export const resolvePageKeyFromRoute = (route: string): string | null => {
  const normalized = route.toLowerCase().replace(/\/+$/, '');
  for (const [routePrefix, pageKey] of Object.entries(ROUTE_TO_PAGE_KEY)) {
    if (normalized === routePrefix || normalized.endsWith(routePrefix)) {
      return pageKey;
    }
  }
  return null;
};

export const normalizeText = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

export const tokenizeQuery = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[^a-z0-9]+/i)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length >= 3)
    )
  ).slice(0, 12);
