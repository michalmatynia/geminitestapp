import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    data: undefined,
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
    mocks.mongoSourceRefetch.mockReset();
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
});
