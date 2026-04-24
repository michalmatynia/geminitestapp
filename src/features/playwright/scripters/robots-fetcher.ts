import 'server-only';

import { isAllowed, parseRobotsTxt, type RobotsTxt } from './robots';

export type RobotsCheckResult = {
  allowed: boolean;
  source: 'fetched' | 'cached' | 'missing' | 'fetch-failed';
  reason?: string;
  robots?: RobotsTxt;
};

export type RobotsFetcherOptions = {
  userAgent?: string;
  ttlMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

type CacheEntry = {
  fetchedAt: number;
  status: 'ok' | 'missing' | 'fetch-failed';
  robots: RobotsTxt | null;
  reason?: string;
};

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_USER_AGENT = 'KangurScripter/1.0';

const robotsUrlFor = (urlString: string): string => {
  const parsed = new URL(urlString);
  return `${parsed.protocol}//${parsed.host}/robots.txt`;
};

export const createRobotsFetcher = (options: RobotsFetcherOptions = {}) => {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();

  const fetchRobots = async (host: string, robotsUrl: string): Promise<CacheEntry> => {
    try {
      const response = await fetchImpl(robotsUrl, {
        headers: { 'user-agent': userAgent, accept: 'text/plain' },
      });
      if (response.status === 404) {
        return { fetchedAt: now(), status: 'missing', robots: null };
      }
      if (!response.ok) {
        return {
          fetchedAt: now(),
          status: 'fetch-failed',
          robots: null,
          reason: `HTTP ${response.status}`,
        };
      }
      const text = await response.text();
      return { fetchedAt: now(), status: 'ok', robots: parseRobotsTxt(text) };
    } catch (error) {
      return {
        fetchedAt: now(),
        status: 'fetch-failed',
        robots: null,
        reason: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // host argument exists to differentiate cache keys upstream
      void host;
    }
  };

  const ensure = async (urlString: string): Promise<{ entry: CacheEntry; cached: boolean }> => {
    const robotsUrl = robotsUrlFor(urlString);
    const cached = cache.get(robotsUrl);
    if (cached && now() - cached.fetchedAt < ttlMs) {
      return { entry: cached, cached: true };
    }
    const entry = await fetchRobots(new URL(urlString).host, robotsUrl);
    cache.set(robotsUrl, entry);
    return { entry, cached: false };
  };

  return {
    async check(urlString: string): Promise<RobotsCheckResult> {
      const { entry, cached } = await ensure(urlString);
      const path = (() => {
        try {
          const parsed = new URL(urlString);
          return `${parsed.pathname}${parsed.search}`;
        } catch {
          return '/';
        }
      })();
      if (entry.status === 'missing') {
        return { allowed: true, source: 'missing' };
      }
      if (entry.status === 'fetch-failed' || !entry.robots) {
        return { allowed: true, source: 'fetch-failed', reason: entry.reason };
      }
      const allowed = isAllowed(entry.robots, userAgent, path);
      return {
        allowed,
        source: cached ? 'cached' : 'fetched',
        robots: entry.robots,
        ...(allowed ? {} : { reason: `Disallowed by robots.txt for ${path}` }),
      };
    },
    invalidate(): void {
      cache.clear();
    },
    snapshot(): Array<{ key: string; entry: CacheEntry }> {
      return Array.from(cache.entries()).map(([key, entry]) => ({ key, entry }));
    },
  };
};

export type RobotsFetcher = ReturnType<typeof createRobotsFetcher>;

let cachedFetcher: RobotsFetcher | null = null;
export const getDefaultRobotsFetcher = (): RobotsFetcher => {
  if (!cachedFetcher) cachedFetcher = createRobotsFetcher();
  return cachedFetcher;
};

export const __resetRobotsFetcherForTests = (): void => {
  cachedFetcher = null;
};
