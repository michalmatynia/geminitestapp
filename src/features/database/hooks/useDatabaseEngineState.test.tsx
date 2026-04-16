import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/lib/api-client';

import { useDatabaseEngineState } from './useDatabaseEngineState';

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  toast: vi.fn(),
  settingsMap: new Map<string, string>(),
  updateSettingsBulkMutateAsync: vi.fn(),
  syncMongoSourcesMutateAsync: vi.fn(),
  searchParams: 'view=engine&foo=bar',
  pathname: '/admin/databases/engine',
  engineStatusRefetch: vi.fn(),
  backupSchedulerStatusRefetch: vi.fn(),
  operationsJobsRefetch: vi.fn(),
  mongoSourceData: undefined as
    | {
        timestamp: string;
        activeSource: 'local' | 'cloud' | null;
        defaultSource: 'local' | 'cloud' | null;
        lastSync: {
          direction: 'cloud_to_local' | 'local_to_cloud';
          source: 'local' | 'cloud';
          target: 'local' | 'cloud';
          syncedAt: string;
          preSyncBackups: never[];
          archivePath: string | null;
          logPath: string | null;
        } | null;
        syncInProgress?: {
          direction: 'cloud_to_local' | 'local_to_cloud';
          source: 'local' | 'cloud';
          target: 'local' | 'cloud';
          acquiredAt: string;
          pid: number;
        } | null;
      }
    | undefined,
  mongoSourceRefetch: vi.fn(),
  providerPreviewRefetch: vi.fn(),
  schemaRefetch: vi.fn(),
  redisOverviewRefetch: vi.fn(),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: mocks.settingsMap,
    isPending: false,
  }),
  useUpdateSettingsBulk: () => ({
    isPending: false,
    mutateAsync: mocks.updateSettingsBulkMutateAsync,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('./useDatabaseQueries', () => ({
  useDatabaseEngineStatus: () => ({
    data: undefined,
    isPending: false,
    refetch: mocks.engineStatusRefetch,
  }),
  useDatabaseBackupSchedulerStatus: () => ({
    data: undefined,
    isPending: false,
    refetch: mocks.backupSchedulerStatusRefetch,
  }),
  useDatabaseEngineOperationsJobs: () => ({
    data: undefined,
    isPending: false,
    refetch: mocks.operationsJobsRefetch,
  }),
  useDatabaseEngineMongoSource: () => ({
    data: mocks.mongoSourceData,
    isPending: false,
    refetch: mocks.mongoSourceRefetch,
  }),
  useDatabaseEngineProviderPreview: () => ({
    data: undefined,
    isPending: false,
    refetch: mocks.providerPreviewRefetch,
  }),
  useSyncDatabaseEngineMongoSourceMutation: () => ({
    isPending: false,
    mutateAsync: mocks.syncMongoSourcesMutateAsync,
  }),
  useAllCollectionsSchema: () => ({
    data: { collections: [] },
    isPending: false,
    refetch: mocks.schemaRefetch,
  }),
  useRedisOverview: () => ({
    data: undefined,
    isPending: false,
    refetch: mocks.redisOverviewRefetch,
  }),
}));

describe('useDatabaseEngineState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.routerPush.mockReset();
    mocks.toast.mockReset();
    mocks.settingsMap = new Map<string, string>();
    mocks.updateSettingsBulkMutateAsync.mockReset();
    mocks.syncMongoSourcesMutateAsync.mockReset();
    mocks.searchParams = 'view=engine&foo=bar';
    mocks.pathname = '/admin/databases/engine';
    mocks.engineStatusRefetch.mockReset();
    mocks.backupSchedulerStatusRefetch.mockReset();
    mocks.operationsJobsRefetch.mockReset();
    mocks.mongoSourceData = undefined;
    mocks.mongoSourceRefetch.mockReset();
    mocks.mongoSourceRefetch.mockResolvedValue({ data: undefined });
    mocks.providerPreviewRefetch.mockReset();
    mocks.schemaRefetch.mockReset();
    mocks.redisOverviewRefetch.mockReset();
  });

  it('updates the current workspace view through router navigation', () => {
    const { result } = renderHook(() => useDatabaseEngineState());

    act(() => {
      result.current.setActiveView('crud');
    });

    expect(mocks.routerPush).toHaveBeenCalledWith('/admin/databases/engine?view=crud&foo=bar');
  });

  it('runs manual Mongo source sync through the dedicated mutation', async () => {
    mocks.syncMongoSourcesMutateAsync.mockResolvedValue({
      success: true,
      message: 'MongoDB sync completed: cloud -> local.',
    });

    const { result } = renderHook(() => useDatabaseEngineState());

    await act(async () => {
      await result.current.syncMongoSources('cloud_to_local');
    });

    expect(mocks.syncMongoSourcesMutateAsync).toHaveBeenCalledWith('cloud_to_local');
    expect(mocks.toast).toHaveBeenCalledWith('MongoDB sync completed: cloud -> local.', {
      variant: 'success',
    });
  });

  it('surfaces the server-provided sync lock message instead of a generic failure toast', async () => {
    mocks.syncMongoSourcesMutateAsync.mockRejectedValue(
      new ApiError(
        'MongoDB sync is already in progress: local -> cloud. Started at 2026-04-16T00:38:12.443Z.',
        423
      )
    );

    const { result } = renderHook(() => useDatabaseEngineState());

    await act(async () => {
      await result.current.syncMongoSources('local_to_cloud');
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      'MongoDB sync is already in progress: local -> cloud. Started at 2026-04-16T00:38:12.443Z.',
      {
        variant: 'warning',
      }
    );
  });

  it('reports a running sync when the request times out but the backend lock is still active', async () => {
    mocks.syncMongoSourcesMutateAsync.mockRejectedValue(new Error('Request timeout after 900000ms'));
    mocks.mongoSourceRefetch.mockResolvedValue({
      data: {
        timestamp: '2026-04-16T00:40:00.000Z',
        activeSource: 'local',
        defaultSource: 'local',
        lastSync: null,
        syncInProgress: {
          direction: 'local_to_cloud',
          source: 'local',
          target: 'cloud',
          acquiredAt: '2026-04-16T00:38:12.443Z',
          pid: 28245,
        },
      },
    });

    const { result } = renderHook(() => useDatabaseEngineState());

    await act(async () => {
      await result.current.syncMongoSources('local_to_cloud');
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      'MongoDB sync is still running: local -> cloud. Started at 2026-04-16T00:38:12.443Z. The server has not reported a final result yet.',
      {
        variant: 'warning',
      }
    );
  });

  it('reports a successful sync when the request times out after the backend already finished', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(Date.parse('2026-04-16T00:38:00.000Z'));
    mocks.syncMongoSourcesMutateAsync.mockRejectedValue(new Error('Request timeout after 900000ms'));
    mocks.mongoSourceRefetch.mockResolvedValue({
      data: {
        timestamp: '2026-04-16T00:40:00.000Z',
        activeSource: 'local',
        defaultSource: 'local',
        lastSync: {
          direction: 'local_to_cloud',
          source: 'local',
          target: 'cloud',
          syncedAt: '2026-04-16T00:38:43.264Z',
          preSyncBackups: [],
          archivePath: '/tmp/mongo-sync.archive',
          logPath: '/tmp/mongo-sync.log',
        },
        syncInProgress: null,
      },
    });

    const { result } = renderHook(() => useDatabaseEngineState());

    await act(async () => {
      await result.current.syncMongoSources('local_to_cloud');
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      'MongoDB sync completed: local -> cloud. Synced at 2026-04-16T00:38:43.264Z.',
      {
        variant: 'success',
      }
    );
  });
});
