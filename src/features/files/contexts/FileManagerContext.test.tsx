// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FileManagerProvider,
  useFileManagerActions,
  useFileManagerConfig,
  useFileManagerData,
  useFileManagerSearch,
  useFileManagerUIState,
} from './FileManagerContext';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  deleteFileMutation: { isPending: false, mutateAsync: vi.fn() },
  files: [
    {
      filepath: '/uploads/folder-1/image-1.jpg',
      id: 'file-1',
      tags: ['alpha'],
    },
  ],
  refetch: vi.fn(),
  toast: vi.fn(),
  updateTagsMutation: { isPending: false, mutateAsync: vi.fn() },
  useFileAsset3dList: vi.fn(),
  useFileQueries: vi.fn(),
}));

vi.mock('@/features/files/hooks/useFileAsset3dQueries', () => ({
  useFileAsset3dList: (filters: unknown) => mocks.useFileAsset3dList(filters),
}));

vi.mock('@/features/files/hooks/useFileQueries', () => ({
  useFileQueries: (query: string) => mocks.useFileQueries(query),
  useDeleteFile: () => mocks.deleteFileMutation,
  useUpdateFileTags: () => mocks.updateTagsMutation,
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mocks.confirm,
    ConfirmationModal: () => null,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe('FileManagerContext', () => {
  beforeEach(() => {
    mocks.confirm.mockReset();
    mocks.refetch.mockReset();
    mocks.toast.mockReset();
    mocks.deleteFileMutation.isPending = false;
    mocks.deleteFileMutation.mutateAsync.mockReset();
    mocks.updateTagsMutation.isPending = false;
    mocks.updateTagsMutation.mutateAsync.mockReset();
    mocks.useFileQueries.mockReturnValue({ data: mocks.files });
    mocks.useFileAsset3dList.mockReturnValue({ data: [] });
  });

  it('throws when strict hooks are used outside the provider', () => {
    expect(() => renderHook(() => useFileManagerConfig())).toThrow(
      'useFileManagerConfig must be used within FileManagerProvider'
    );
    expect(() => renderHook(() => useFileManagerSearch())).toThrow(
      'useFileManagerSearch must be used within FileManagerProvider'
    );
    expect(() => renderHook(() => useFileManagerUIState())).toThrow(
      'useFileManagerUIState must be used within FileManagerProvider'
    );
    expect(() => renderHook(() => useFileManagerData())).toThrow(
      'useFileManagerData must be used within FileManagerProvider'
    );
    expect(() => renderHook(() => useFileManagerActions())).toThrow(
      'useFileManagerActions must be used within FileManagerProvider'
    );
  });

  it('provides split file-manager contexts inside the provider', () => {
    const onSelectFile = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FileManagerProvider
        autoConfirmSelection
        defaultFolder='folder-1'
        mode='select'
        onSelectFile={onSelectFile}
        selectionMode='single'
        showBulkActions
        showFolderFilter
        showTagSearch
      >
        {children}
      </FileManagerProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useFileManagerActions(),
        config: useFileManagerConfig(),
        data: useFileManagerData(),
        search: useFileManagerSearch(),
        ui: useFileManagerUIState(),
      }),
      { wrapper }
    );

    expect(result.current.config).toMatchObject({
      autoConfirmSelection: true,
      defaultFolder: 'folder-1',
      mode: 'select',
      selectionMode: 'single',
      showBulkActions: true,
      showFolderFilter: true,
      showTagSearch: true,
    });
    expect(result.current.search).toMatchObject({
      filenameSearch: '',
      productNameSearch: '',
      tagSearch: '',
    });
    expect(result.current.ui).toMatchObject({
      activeTab: 'uploads',
      bulkTagInput: '',
      bulkTagMode: 'add',
      localFolderFilter: null,
      selectedFiles: [],
    });
    expect(result.current.data).toMatchObject({
      assets3d: [],
      files: mocks.files,
      folderFilter: 'folder-1',
      folderOptions: ['all', 'folder-1'],
      isPending: false,
    });
    expect(result.current.actions.handleToggleSelect).toBeTypeOf('function');
    expect(result.current.actions.handleConfirmSelection).toBeTypeOf('function');
    expect(result.current.actions.handleDelete).toBeTypeOf('function');
  });
});
