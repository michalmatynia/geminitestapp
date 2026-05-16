/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const meMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/services/kangur-shell-session-client', () => ({
  kangurShellSessionClient: {
    auth: {
      me: meMock,
    },
    learners: {
      select: vi.fn(),
    },
  },
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientErrorSync: <T,>(_: unknown, task: () => T) => task(),

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

const AUTHENTICATED_USER = {
  id: 'parent-1',
  full_name: 'Ada Parent',
  email: 'ada@example.com',
  role: 'user' as const,
  actorType: 'learner' as const,
  canManageLearners: false,
  ownerUserId: 'parent-1',
  activeLearner: {
    id: 'learner-1',
    ownerUserId: 'parent-1',
    displayName: 'Ada',
    loginName: 'ada-child',
    status: 'active' as const,
    legacyUserKey: 'ada@example.com',
    createdAt: '2026-03-06T10:00:00.000Z',
    updatedAt: '2026-03-06T10:00:00.000Z',
  },
  learners: [],
};

const BOOTSTRAP_ELEMENT_ID = 'kangur-auth-bootstrap-data';

function injectBootstrapDataElement(data: unknown): void {
  const existing = document.getElementById(BOOTSTRAP_ELEMENT_ID);
  if (existing) existing.remove();
  const el = document.createElement('script');
  el.id = BOOTSTRAP_ELEMENT_ID;
  el.type = 'application/json';
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);
}

function removeBootstrapDataElement(): void {
  document.getElementById(BOOTSTRAP_ELEMENT_ID)?.remove();
}

describe('kangur-auth-bootstrap-cache', () => {
  beforeEach(() => {
    vi.resetModules();
    meMock.mockReset();
    removeBootstrapDataElement();
  });

  it('hydrates a late guest bootstrap without calling auth.me', async () => {
    const cache = await import('@/features/kangur/ui/context/kangur-auth-bootstrap-cache');

    expect(cache.readKangurAuthBootstrapCache()).toBeUndefined();

    injectBootstrapDataElement(null);

    expect(cache.readKangurAuthBootstrapCache()).toBeNull();
    expect(meMock).not.toHaveBeenCalled();
  });

  it('hydrates a late authenticated bootstrap without calling auth.me', async () => {
    const cache = await import('@/features/kangur/ui/context/kangur-auth-bootstrap-cache');

    injectBootstrapDataElement(AUTHENTICATED_USER);

    expect(cache.readKangurAuthBootstrapCache()).toEqual(AUTHENTICATED_USER);
    expect(meMock).not.toHaveBeenCalled();
  });

  it('loads a late guest bootstrap session without falling back to auth.me', async () => {
    const cache = await import('@/features/kangur/ui/context/kangur-auth-bootstrap-cache');

    injectBootstrapDataElement(null);

    await expect(cache.loadKangurAuthBootstrapSession()).resolves.toBeNull();
    expect(meMock).not.toHaveBeenCalled();
  });
});
