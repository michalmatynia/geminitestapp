// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getImageStudioProjectSessionKey } from '@/features/ai/image-studio/utils/project-session';

import { SlotsProvider, useSlotsActions, useSlotsState } from './SlotsContext';

const mocks = vi.hoisted(() => ({
  slots: [
    {
      id: 'slot-1',
      name: 'Primary',
      folderPath: 'Root',
      metadata: null,
    },
    {
      id: 'slot-2',
      name: 'Composite',
      folderPath: 'Root/Composite',
      metadata: { role: 'composite' },
    },
  ] as Array<Record<string, unknown>>,
  setQueryData: vi.fn(),
  refetchSlots: vi.fn(),
  createSlots: vi.fn(),
  updateSlot: vi.fn(),
  deleteSlot: vi.fn(),
  uploadAssets: vi.fn(),
  importFromDrive: vi.fn(),
  updateSetting: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: mocks.setQueryData,
  }),
}));

vi.mock('@/features/ai/image-studio/hooks/useImageStudioQueries', () => ({
  studioKeys: {
    slots: (projectId: string | null) => ['studio', 'slots', projectId],
    mutation: (key: string) => ['studio', 'mutation', key],
  },
  useStudioSlots: () =>
    ({
      data: { slots: mocks.slots },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mocks.refetchSlots,
    }) as never,
}));

vi.mock('@/features/ai/image-studio/hooks/useImageStudioMutations', () => ({
  useCreateStudioSlots: () =>
    ({
      mutateAsync: mocks.createSlots,
      isPending: false,
    }) as never,
  useUpdateStudioSlot: () =>
    ({
      mutateAsync: mocks.updateSlot,
      isPending: false,
    }) as never,
  useDeleteStudioSlot: () =>
    ({
      mutateAsync: mocks.deleteSlot,
      isPending: false,
    }) as never,
  useUploadStudioAssets: () =>
    ({
      mutateAsync: mocks.uploadAssets,
      isPending: false,
    }) as never,
  useImportStudioAssetsFromDrive: () =>
    ({
      mutateAsync: mocks.importFromDrive,
      isPending: false,
    }) as never,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: new Map<string, string>(),
    isLoading: false,
  }),
  useUpdateSetting: () => ({
    mutateAsync: mocks.updateSetting,
  }),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createCreateMutationV2: (config: { mutationFn: (input: string) => Promise<string> }) => ({
    mutateAsync: config.mutationFn,
    isPending: false,
  }),
}));

vi.mock('./ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-1',
  }),
}));

describe('SlotsContext', () => {
  beforeEach(() => {
    mocks.setQueryData.mockReset();
    mocks.refetchSlots.mockReset().mockResolvedValue(undefined);
    mocks.createSlots.mockReset().mockResolvedValue({
      slots: [],
    });
    mocks.updateSlot.mockReset().mockResolvedValue(undefined);
    mocks.deleteSlot.mockReset().mockResolvedValue(undefined);
    mocks.uploadAssets.mockReset().mockResolvedValue({
      importedFiles: [],
    });
    mocks.importFromDrive.mockReset().mockResolvedValue({
      importedFiles: [],
    });
    mocks.updateSetting.mockReset().mockResolvedValue(undefined);
  });

  it('throws outside the provider for the strict hooks', () => {
    expect(() => renderHook(() => useSlotsState())).toThrow(
      'useSlotsState must be used within a SlotsProvider'
    );
    expect(() => renderHook(() => useSlotsActions())).toThrow(
      'useSlotsState must be used within a SlotsProvider'
    );
  });

  it('derives selected slots and persists folder creation through the provider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SlotsProvider>{children}</SlotsProvider>
    );

    const { result } = renderHook(
      () => ({
        state: useSlotsState(),
        actions: useSlotsActions(),
      }),
      { wrapper }
    );

    let createdFolder = '';
    await act(async () => {
      result.current.actions.setSelectedSlotId('slot-1');
      result.current.actions.setWorkingSlotId('slot-2');
      result.current.actions.setPreviewMode('3d');
      result.current.actions.setCompositeAssetIds(['slot-2']);
      createdFolder = await result.current.actions.createFolder('Root/Nested');
    });

    expect(result.current.state.selectedSlot?.id).toBe('slot-1');
    expect(result.current.state.workingSlot?.id).toBe('slot-2');
    expect(result.current.state.compositeSlot?.id).toBe('slot-2');
    expect(result.current.state.compositeAssets.map((slot) => slot.id)).toEqual(['slot-2']);
    expect(result.current.state.previewMode).toBe('3d');
    expect(result.current.state.virtualFolders).toEqual(['Root']);
    expect(createdFolder).toBe('Root/Nested');
    expect(result.current.state.expandFolderPath('Root/Nested/Leaf')).toEqual([
      'Root',
      'Root/Nested',
      'Root/Nested/Leaf',
    ]);
    expect(mocks.updateSetting).toHaveBeenCalledWith({
      key: getImageStudioProjectSessionKey('project-1'),
      value: expect.any(String),
    });
  });
});
