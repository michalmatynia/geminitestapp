import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDatabaseBackupsState } from '@/features/database/hooks/useDatabaseBackupsState';
import { localHmToUtcHm } from '@/shared/lib/db/utils/backup-schedule-time';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
} from '@/shared/lib/db/database-engine-constants';
import { useToast } from '@/shared/ui';

import {
  useCreateBackupMutation,
  useDatabaseBackups,
  useDeleteBackupMutation,
  useRestoreBackupMutation,
  useUploadBackupMutation,
} from '@/features/database/hooks/useDatabaseQueries';

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(),
  useUpdateSetting: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: vi.fn(),
}));

vi.mock('@/features/database/hooks/useDatabaseQueries', () => ({
  useCreateBackupMutation: vi.fn(),
  useDatabaseBackups: vi.fn(),
  useDeleteBackupMutation: vi.fn(),
  useRestoreBackupMutation: vi.fn(),
  useUploadBackupMutation: vi.fn(),
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createSettingsMap = (schedule: Record<string, unknown>): Map<string, string> =>
  new Map([
    [DATABASE_ENGINE_BACKUP_SCHEDULE_KEY, JSON.stringify(schedule)],
    [
      DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
      JSON.stringify(DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS),
    ],
  ]);

describe('useDatabaseBackupsState schedule persistence', () => {
  const fixedNow = new Date('2026-02-27T12:00:00.000Z');
  const toastSpy = vi.fn();
  const updateSettingMutateAsync = vi.fn();
  const settingsRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    vi.mocked(useToast).mockReturnValue({
      toast: toastSpy,
    });

    vi.mocked(useSettingsMap).mockReturnValue({
      data: createSettingsMap({
        ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
        postgresql: {
          ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE.postgresql,
          enabled: false,
          cadence: 'weekly',
          weekday: 4,
          timeUtc: '19:45',
        },
      }),
      refetch: settingsRefetch,
    } as unknown as ReturnType<typeof useSettingsMap>);

    vi.mocked(useUpdateSetting).mockReturnValue({
      mutateAsync: updateSettingMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateSetting>);

    vi.mocked(useDatabaseBackups).mockReturnValue({
      data: [],
      isFetching: false,
    } as unknown as ReturnType<typeof useDatabaseBackups>);

    vi.mocked(useCreateBackupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useCreateBackupMutation>);
    vi.mocked(useRestoreBackupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useRestoreBackupMutation>);
    vi.mocked(useUploadBackupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useUploadBackupMutation>);
    vi.mocked(useDeleteBackupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useDeleteBackupMutation>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
  );

  it('saves MongoDB daily 2:00 local schedule and keeps PostgreSQL target untouched', async () => {
    const { result } = renderHook(() => useDatabaseBackupsState(), { wrapper });

    act(() => {
      result.current.setActiveTab('mongodb');
    });

    act(() => {
      result.current.handleSchedulerEnabledDraftChange(true);
      result.current.handleActiveTargetEnabledDraftChange(true);
      result.current.handleActiveTargetTimeLocalChange('02:00');
    });

    await act(async () => {
      await result.current.saveDailySchedule();
    });

    expect(updateSettingMutateAsync).toHaveBeenCalledTimes(1);
    const payload = updateSettingMutateAsync.mock.calls[0]?.[0] as { key: string; value: string };
    expect(payload.key).toBe(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY);
    const parsed = JSON.parse(payload.value) as Record<string, unknown>;
    const mongodb = parsed['mongodb'] as Record<string, unknown>;
    const postgresql = parsed['postgresql'] as Record<string, unknown>;
    const expectedUtc = localHmToUtcHm('02:00', fixedNow);

    expect(parsed['schedulerEnabled']).toBe(true);
    expect(mongodb['enabled']).toBe(true);
    expect(mongodb['cadence']).toBe('daily');
    expect(mongodb['intervalDays']).toBe(1);
    expect(mongodb['timeUtc']).toBe(expectedUtc);
    expect(postgresql).toEqual({
      ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE.postgresql,
      enabled: false,
      cadence: 'weekly',
      weekday: 4,
      timeUtc: '19:45',
    });
    expect(settingsRefetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/databases/engine/backup-scheduler/status', {
      method: 'GET',
      cache: 'no-store',
    });
  });

  it('keeps PostgreSQL target unchanged when saving from MongoDB tab', async () => {
    const customSchedule = {
      ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
      schedulerEnabled: false,
      repeatTickEnabled: false,
      postgresql: {
        ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE.postgresql,
        enabled: true,
        cadence: 'weekly',
        weekday: 2,
        intervalDays: 7,
        timeUtc: '03:15',
        lastStatus: 'success',
      },
    };

    vi.mocked(useSettingsMap).mockReturnValue({
      data: createSettingsMap(customSchedule),
      refetch: settingsRefetch,
    } as unknown as ReturnType<typeof useSettingsMap>);

    const { result } = renderHook(() => useDatabaseBackupsState(), { wrapper });

    act(() => {
      result.current.setActiveTab('mongodb');
      result.current.handleSchedulerEnabledDraftChange(true);
      result.current.handleActiveTargetEnabledDraftChange(true);
      result.current.handleActiveTargetTimeLocalChange('02:00');
    });

    await act(async () => {
      await result.current.saveDailySchedule();
    });

    const payload = updateSettingMutateAsync.mock.calls[0]?.[0] as { value: string };
    const parsed = JSON.parse(payload.value) as {
      postgresql: Record<string, unknown>;
    };

    expect(parsed.postgresql).toEqual(customSchedule.postgresql);
  });

  it('persists repeat tick toggle independently through schedule save payload', async () => {
    const { result } = renderHook(() => useDatabaseBackupsState(), { wrapper });

    act(() => {
      result.current.handleRepeatSchedulerTickDraftChange(true);
    });
    expect(result.current.repeatTickEnabledDraft).toBe(true);

    await act(async () => {
      await result.current.saveDailySchedule();
    });

    const payload = updateSettingMutateAsync.mock.calls[0]?.[0] as { value: string };
    const parsed = JSON.parse(payload.value) as {
      schedulerEnabled: boolean;
      repeatTickEnabled: boolean;
    };

    expect(parsed.repeatTickEnabled).toBe(true);
    expect(parsed.schedulerEnabled).toBe(false);
  });
});
