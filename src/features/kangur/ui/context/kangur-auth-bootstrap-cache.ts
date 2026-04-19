import {
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { kangurShellSessionClient } from '@/features/kangur/services/kangur-shell-session-client';
import type { KangurUser } from '@kangur/platform';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';

const AUTH_BOOTSTRAP_CACHE_TTL_MS = 30_000;

type KangurAuthBootstrapCacheEntry = {
  expiresAt: number;
  user: KangurUser | null;
};

let kangurAuthBootstrapCache: KangurAuthBootstrapCacheEntry | null = null;
let kangurAuthBootstrapInflight: Promise<KangurUser | null> | null = null;
let kangurAuthSsrBootstrapConsumed = false;

// Hydrate from SSR-injected bootstrap data if available — eliminates the
// client-side /auth/me round-trip on first load.
const hydrateKangurAuthFromSsrBootstrap = (): void => {
  if (kangurAuthSsrBootstrapConsumed) return;

  if (typeof window === 'undefined') return;
  const win = window as typeof window & { __KANGUR_AUTH_BOOTSTRAP__?: KangurUser | null };
  const ssrUser = win.__KANGUR_AUTH_BOOTSTRAP__;

  if (typeof ssrUser === 'undefined') return;
  kangurAuthSsrBootstrapConsumed = true;

  kangurAuthBootstrapCache = {
    user: ssrUser,
    expiresAt: Date.now() + AUTH_BOOTSTRAP_CACHE_TTL_MS,
  };

  delete win.__KANGUR_AUTH_BOOTSTRAP__;
};

// Auto-hydrate on module load (before any component mounts)
hydrateKangurAuthFromSsrBootstrap();

export const primeKangurAuthBootstrapCache = (user: KangurUser | null): void => {
  kangurAuthBootstrapCache = {
    user,
    expiresAt: Date.now() + AUTH_BOOTSTRAP_CACHE_TTL_MS,
  };
};

export const readKangurAuthBootstrapCache = (): KangurUser | null | undefined => {
  if (!kangurAuthBootstrapCache) {
    hydrateKangurAuthFromSsrBootstrap();
  }

  if (!kangurAuthBootstrapCache) {
    return undefined;
  }

  if (kangurAuthBootstrapCache.expiresAt <= Date.now()) {
    kangurAuthBootstrapCache = null;
    return undefined;
  }

  return kangurAuthBootstrapCache.user;
};

const clearKangurAuthBootstrapCacheState = (): void => {
  kangurAuthBootstrapCache = null;
  kangurAuthBootstrapInflight = null;
};

export const loadKangurAuthBootstrapSession = async (): Promise<KangurUser | null> => {
  const cachedUser = readKangurAuthBootstrapCache();
  if (typeof cachedUser !== 'undefined') {
    return cachedUser;
  }

  if (kangurAuthBootstrapInflight) {
    return await kangurAuthBootstrapInflight;
  }

  kangurAuthBootstrapInflight = kangurShellSessionClient.auth
    .me()
    .then((nextUser) => {
      primeKangurAuthBootstrapCache(nextUser);
      return nextUser;
    })
    .finally(() => {
      kangurAuthBootstrapInflight = null;
    });

  return await kangurAuthBootstrapInflight;
};

export const clearKangurAuthBootstrapCache = (): void => {
  clearKangurAuthBootstrapCacheState();
};

export const resolveCanAccessParentAssignments = (
  user: KangurUser | null,
  isAuthenticated: boolean
): boolean =>
  isAuthenticated &&
  user?.actorType === 'learner' &&
  Boolean(user?.activeLearner?.id);

export const resolveErrorMessage = (value: unknown): string => {
  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message;
  }
  return 'Authentication check failed';
};

export const appendAuthModeParam = (href: string, authMode?: KangurAuthMode): string => {
  if (!authMode) {
    return href;
  }
  return withKangurClientErrorSync(
    {
      source: 'kangur.auth',
      action: 'append-auth-mode',
      description: 'Adds auth mode to the Kangur login href.',
      context: { authMode },
    },
    () => {
      const parsed = new URL(href, 'https://kangur.local');
      parsed.searchParams.set('authMode', authMode);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    },
    {
      fallback: `${href}${href.includes('?') ? '&' : '?'}authMode=${encodeURIComponent(authMode)}`,
    }
  );
};

export { kangurShellSessionClient };
