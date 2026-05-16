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

const KANGUR_AUTH_BOOTSTRAP_ELEMENT_ID = 'kangur-auth-bootstrap-data';

// Hydrate from the SSR JSON data island injected by renderKangurAuthBootstrapScript.
// Reads the <script type="application/json"> element and parses its text content —
// eliminates the client-side /auth/me round-trip on first load without using a
// global window variable or triggering React 19's inline-script warning.
const hydrateKangurAuthFromSsrBootstrap = (): void => {
  if (kangurAuthSsrBootstrapConsumed) return;
  if (typeof document === 'undefined') return;

  const el = document.getElementById(KANGUR_AUTH_BOOTSTRAP_ELEMENT_ID);
  if (!el) return;

  kangurAuthSsrBootstrapConsumed = true;

  try {
    const parsed = JSON.parse(el.textContent ?? 'undefined') as KangurUser | null | undefined;
    if (typeof parsed === 'undefined') return;

    kangurAuthBootstrapCache = {
      user: parsed,
      expiresAt: Date.now() + AUTH_BOOTSTRAP_CACHE_TTL_MS,
    };
  } catch {
    // Malformed JSON — treat as cache miss, let /auth/me run normally.
  }
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
