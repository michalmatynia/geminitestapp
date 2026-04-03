import { describe, expect, it } from 'vitest';

import { resolveRequestedFileSyncResolution } from '@/features/case-resolver/hooks/useCaseResolverState.helpers.view-state';

describe('resolveRequestedFileSyncResolution', () => {
  it('returns a no-op selection plan when no requested file is present', () => {
    expect(
      resolveRequestedFileSyncResolution({
        requestedFileId: null,
        requestedFileExists: false,
        handledRequestedFileId: 'file-1',
        selectedFileId: 'file-1',
        selectedAssetId: 'asset-1',
        selectedFolderPath: 'folder/a',
        activeFileId: 'file-1',
      })
    ).toEqual({
      nextHandledRequestedFileId: null,
      shouldClearSelectedAsset: false,
      shouldClearSelectedFolder: false,
    });
  });

  it('clears side selections and active workspace state when the requested file is missing', () => {
    expect(
      resolveRequestedFileSyncResolution({
        requestedFileId: 'missing-file',
        requestedFileExists: false,
        handledRequestedFileId: null,
        selectedFileId: null,
        selectedAssetId: 'asset-1',
        selectedFolderPath: 'folder/a',
        activeFileId: 'active-file',
      })
    ).toEqual({
      nextHandledRequestedFileId: null,
      nextSelectedFileId: 'missing-file',
      shouldClearSelectedAsset: true,
      shouldClearSelectedFolder: true,
      nextActiveFileId: null,
    });
  });

  it('syncs an unhandled requested file into selection and workspace state', () => {
    expect(
      resolveRequestedFileSyncResolution({
        requestedFileId: 'file-2',
        requestedFileExists: true,
        handledRequestedFileId: null,
        selectedFileId: null,
        selectedAssetId: 'asset-1',
        selectedFolderPath: 'folder/a',
        activeFileId: null,
      })
    ).toEqual({
      nextHandledRequestedFileId: 'file-2',
      nextSelectedFileId: 'file-2',
      shouldClearSelectedAsset: true,
      shouldClearSelectedFolder: true,
      nextActiveFileId: 'file-2',
    });
  });

  it('skips repeated sync work when the requested file was already handled', () => {
    expect(
      resolveRequestedFileSyncResolution({
        requestedFileId: 'file-2',
        requestedFileExists: true,
        handledRequestedFileId: 'file-2',
        selectedFileId: 'file-2',
        selectedAssetId: null,
        selectedFolderPath: null,
        activeFileId: 'file-2',
      })
    ).toEqual({
      nextHandledRequestedFileId: 'file-2',
      shouldClearSelectedAsset: false,
      shouldClearSelectedFolder: false,
    });
  });
});
