import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseKangurPageContentStore } from '@/shared/contracts/kangur-page-content';

const {
  clearKangurPageContentServerCacheMock,
  getKangurPageContentStoreMock,
  upsertKangurPageContentStoreMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  clearKangurPageContentServerCacheMock: vi.fn(),
  getKangurPageContentStoreMock: vi.fn(),
  upsertKangurPageContentStoreMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/page-content-repository', () => ({
  clearKangurPageContentServerCache: clearKangurPageContentServerCacheMock,
  getKangurPageContentStore: getKangurPageContentStoreMock,
  upsertKangurPageContentStore: upsertKangurPageContentStoreMock,
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: (actor: { activeLearner?: unknown }) => actor.activeLearner,
}));

import {
  clearKangurPageContentHandlerCache,
  getKangurPageContentHandler,
  postKangurPageContentHandler,
} from './handler';

const DEFAULT_STORE = parseKangurPageContentStore({
  locale: 'pl',
  version: 1,
  entries: [
    {
      id: 'game-home-actions',
      pageKey: 'Game',
      screenKey: 'home',
      surface: 'game',
      route: '/game',
      componentId: 'home-actions',
      widget: 'KangurGameHomeActionsWidget',
      sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
      title: 'Szybkie akcje',
      summary: 'Szybki dostęp do najważniejszych akcji na stronie głównej gry.',
      body: 'Sekcja zbiera skróty do głównych aktywności w Kangurze.',
      anchorIdPrefix: 'kangur-game-home-actions',
      focusKind: 'home_actions',
      contentIdPrefixes: ['game:home'],
      nativeGuideIds: ['shared-home-actions'],
      triggerPhrases: ['szybkie akcje'],
      tags: ['page-content', 'game'],
      enabled: true,
      sortOrder: 10,
    },
  ],
});

const createRequestContext = (body?: unknown, query?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-page-content-1',
    traceId: 'trace-kangur-page-content-1',
    correlationId: 'corr-kangur-page-content-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
    query,
  }) as ApiHandlerContext;

describe('kangur page content handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurPageContentHandlerCache();
    getKangurPageContentStoreMock.mockResolvedValue(DEFAULT_STORE);
    upsertKangurPageContentStoreMock.mockResolvedValue(DEFAULT_STORE);
    resolveKangurActorMock.mockResolvedValue({
      actorId: 'admin-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'admin',
      ownerUserId: 'admin-1',
      ownerEmail: 'admin@example.com',
      ownerName: 'Admin',
      ownerEmailVerified: true,
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'admin-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'admin@example.com',
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
      learners: [],
    });
  });

  it('returns page content for the requested locale', async () => {
    const response = await getKangurPageContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/page-content?locale=pl'),
      createRequestContext(undefined, { locale: 'pl' })
    );

    expect(getKangurPageContentStoreMock).toHaveBeenCalledWith('pl');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=300'
    );
    await expect(response.json()).resolves.toEqual(DEFAULT_STORE);
  });

  it('reuses cached page content across repeated list requests', async () => {
    const first = await getKangurPageContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/page-content?locale=en'),
      createRequestContext(undefined, { locale: 'en' })
    );
    const second = await getKangurPageContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/page-content?locale=en'),
      createRequestContext(undefined, { locale: 'en' })
    );

    expect(getKangurPageContentStoreMock).toHaveBeenCalledTimes(1);
    expect(getKangurPageContentStoreMock).toHaveBeenCalledWith('en');
    expect(first.headers.get('cache-control')).toBe('public, max-age=60, stale-while-revalidate=300');
    expect(second.headers.get('cache-control')).toBe('public, max-age=60, stale-while-revalidate=300');
    await expect(first.json()).resolves.toEqual(DEFAULT_STORE);
    await expect(second.json()).resolves.toEqual(DEFAULT_STORE);
  });

  it('allows admins to upsert page content', async () => {
    const response = await postKangurPageContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/page-content', {
        method: 'POST',
      }),
      createRequestContext(DEFAULT_STORE)
    );

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(upsertKangurPageContentStoreMock).toHaveBeenCalledWith(DEFAULT_STORE);
    expect(clearKangurPageContentServerCacheMock).toHaveBeenCalledWith('pl');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEFAULT_STORE);
  });

  it('clears the cached locale after an admin update', async () => {
    await getKangurPageContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/page-content?locale=en'),
      createRequestContext(undefined, { locale: 'en' })
    );

    const updatedStore = parseKangurPageContentStore({
      ...DEFAULT_STORE,
      locale: 'en',
      entries: DEFAULT_STORE.entries.map((entry) =>
        entry.id === 'game-home-actions'
          ? {
              ...entry,
              title: 'Quick actions',
            }
          : entry
      ),
    });

    upsertKangurPageContentStoreMock.mockResolvedValueOnce(updatedStore);
    getKangurPageContentStoreMock.mockResolvedValueOnce(updatedStore);

    await postKangurPageContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/page-content', {
        method: 'POST',
      }),
      createRequestContext(updatedStore)
    );

    const refreshed = await getKangurPageContentHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/page-content?locale=en'),
      createRequestContext(undefined, { locale: 'en' })
    );

    expect(getKangurPageContentStoreMock).toHaveBeenCalledTimes(2);
    await expect(refreshed.json()).resolves.toEqual(updatedStore);
  });

  it('rejects non-admin actors from updating page content', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      ownerUserId: 'parent-1',
      ownerEmail: 'parent@example.com',
      ownerName: 'Parent',
      ownerEmailVerified: true,
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'parent@example.com',
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
      learners: [],
    });

    await expect(
      postKangurPageContentHandler(
        new NextRequest('http://localhost/api/kangur/ai-tutor/page-content', {
          method: 'POST',
        }),
        createRequestContext(DEFAULT_STORE)
      )
    ).rejects.toThrow('Only admins can update Kangur page content.');
  });
});
