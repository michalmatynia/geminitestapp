import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDatabaseBackupsState } from './useDatabaseBackupsState';

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  toast: vi.fn(),
  settingsMap: new Map<string, string>(),
  settingsRefetch: vi.fn(),
  updateSettingMutateAsync: vi.fn(),
  createBackupMutateAsync: vi.fn(),
  restoreBackupMutateAsync: vi.fn(),
  uploadBackupMutateAsync: vi.fn(),
  deleteBackupMutateAsync: vi.fn(),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: mocks.settingsMap,
    isPending: false,
    refetch: mocks.settingsRefetch,
  }),
  useUpdateSetting: () => ({
    isPending: false,
    mutateAsync: mocks.updateSettingMutateAsync,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('./useDatabaseQueries', () => ({
  useDatabaseBackups: () => ({
    data: [],
    isFetching: false,
  }),
  useCreateBackupMutation: () => ({
    mutateAsync: mocks.createBackupMutateAsync,
  }),
  useRestoreBackupMutation: () => ({
    mutateAsync: mocks.restoreBackupMutateAsync,
  }),
  useUploadBackupMutation: () => ({
    mutateAsync: mocks.uploadBackupMutateAsync,
  }),
  useDeleteBackupMutation: () => ({
    mutateAsync: mocks.deleteBackupMutateAsync,
  }),
}));

describe('useDatabaseBackupsState', () => {
  beforeEach(() => {
    mocks.routerPush.mockReset();
    mocks.toast.mockReset();
    mocks.settingsMap = new Map<string, string>();
    mocks.settingsRefetch.mockReset();
    mocks.updateSettingMutateAsync.mockReset();
    mocks.createBackupMutateAsync.mockReset();
    mocks.restoreBackupMutateAsync.mockReset();
    mocks.uploadBackupMutateAsync.mockReset();
    mocks.deleteBackupMutateAsync.mockReset();
  });

  it('navigates to a specific backup preview', () => {
    const { result } = renderHook(() => useDatabaseBackupsState());

    act(() => {
      result.current.handlePreview('nightly snapshot.gz');
    });

    expect(mocks.routerPush).toHaveBeenCalledWith(
      '/admin/databases/preview?backup=nightly%20snapshot.gz&type=mongodb'
    );
  });

  it('navigates to the current database preview', () => {
    const { result } = renderHook(() => useDatabaseBackupsState());

    act(() => {
      result.current.handlePreviewCurrent();
    });

    expect(mocks.routerPush).toHaveBeenCalledWith('/admin/databases/preview?mode=current&type=mongodb');
  });

  it('deletes the selected backup after confirmation', async () => {
    mocks.deleteBackupMutateAsync.mockResolvedValue({
      ok: true,
      payload: { success: true, message: 'Backup deleted' },
    });
    const { result } = renderHook(() => useDatabaseBackupsState());

    act(() => {
      result.current.handleDeleteRequest('old-local.archive');
    });

    expect(result.current.backupToDelete).toBe('old-local.archive');

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(mocks.deleteBackupMutateAsync).toHaveBeenCalledWith({
      dbType: 'mongodb',
      backupName: 'old-local.archive',
    });
    expect(mocks.toast).toHaveBeenCalledWith('Backup deleted successfully.', {
      variant: 'success',
    });
    expect(result.current.backupToDelete).toBeNull();
  });
});
