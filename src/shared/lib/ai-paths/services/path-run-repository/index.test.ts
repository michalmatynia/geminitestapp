import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCollectionProviderMock,
  getCollectionRouteMapMock,
  mongoPathRunRepositoryMock,
} = vi.hoisted(() => ({
  getCollectionProviderMock: vi.fn(),
  getCollectionRouteMapMock: vi.fn(),
  mongoPathRunRepositoryMock: {
    list: vi.fn(),
  },
}));

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  getCollectionProvider: getCollectionProviderMock,
  getCollectionRouteMap: getCollectionRouteMapMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository/mongo-path-run-repository', () => ({
  mongoPathRunRepository: mongoPathRunRepositoryMock,
}));

import {
  AI_PATH_RUNS_COLLECTION,
  getPathRunRepository,
  hasRunRepositorySelectionMismatch,
  readPersistedRunRepositorySelection,
  resolvePathRunRepository,
} from '@/shared/lib/ai-paths/services/path-run-repository';

describe('path run repository selection helpers', () => {
  beforeEach(() => {
    getCollectionProviderMock.mockReset();
    getCollectionRouteMapMock.mockReset();
  });

  it('normalizes persisted run repository metadata and drops empty selections', () => {
    expect(
      readPersistedRunRepositorySelection({
        runRepository: {
          collection: ' ai_path_runs ',
          provider: 'mongodb',
          routeMode: 'fallback',
          selectedAt: ' 2026-03-22T12:00:00.000Z ',
        },
      })
    ).toEqual({
      collection: 'ai_path_runs',
      provider: 'mongodb',
      routeMode: 'fallback',
      selectedAt: '2026-03-22T12:00:00.000Z',
    });

    expect(
      readPersistedRunRepositorySelection({
        runRepository: {
          collection: '   ',
          provider: 'postgres',
          routeMode: 'invalid',
          selectedAt: '',
        },
      })
    ).toBeNull();
  });

  it('detects mismatches against the current repository selection', () => {
    expect(
      hasRunRepositorySelectionMismatch(
        {
          collection: AI_PATH_RUNS_COLLECTION,
          provider: 'mongodb',
          routeMode: 'fallback',
          selectedAt: '2026-03-22T12:00:00.000Z',
        },
        {
          collection: AI_PATH_RUNS_COLLECTION,
          provider: 'mongodb',
          routeMode: 'fallback',
        }
      )
    ).toBe(false);

    expect(
      hasRunRepositorySelectionMismatch(
        {
          collection: AI_PATH_RUNS_COLLECTION,
          provider: 'mongodb',
          routeMode: 'fallback',
          selectedAt: '2026-03-22T12:00:00.000Z',
        },
        {
          collection: AI_PATH_RUNS_COLLECTION,
          provider: 'mongodb',
          routeMode: 'explicit',
        }
      )
    ).toBe(true);
  });

  it('resolves the mongo repository and exposes the selected repo directly', async () => {
    getCollectionProviderMock.mockResolvedValue('mongodb');
    getCollectionRouteMapMock.mockResolvedValue({
      ' AI_PATH_RUNS ': 'mongodb',
    });

    await expect(resolvePathRunRepository()).resolves.toEqual({
      collection: AI_PATH_RUNS_COLLECTION,
      provider: 'mongodb',
      repo: mongoPathRunRepositoryMock,
      routeMode: 'explicit',
    });
    await expect(getPathRunRepository()).resolves.toBe(mongoPathRunRepositoryMock);
  });
});
