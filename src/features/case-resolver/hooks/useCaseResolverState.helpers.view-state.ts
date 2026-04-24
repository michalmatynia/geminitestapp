export type CaseResolverRequestedFileSyncResolution = {
  nextHandledRequestedFileId: string | null;
  nextSelectedFileId?: string | null;
  shouldClearSelectedAsset: boolean;
  shouldClearSelectedFolder: boolean;
  nextActiveFileId?: string | null;
};

const resolveRequestedFileNextActiveFileId = ({
  requestedFileExists,
  requestedFileId,
}: {
  requestedFileExists: boolean;
  requestedFileId: string;
}): string | null => (requestedFileExists ? requestedFileId : null);

const resolveRequestedFileNextSelectedFileId = ({
  requestedFileId,
  selectedFileId,
}: {
  requestedFileId: string;
  selectedFileId: string | null;
}): string | null | undefined =>
  selectedFileId !== requestedFileId ? requestedFileId : undefined;

export const resolveRequestedFileSyncResolution = ({
  requestedFileId,
  requestedFileExists,
  handledRequestedFileId,
  selectedFileId,
  selectedAssetId,
  selectedFolderPath,
  activeFileId,
}: {
  requestedFileId: string | null;
  requestedFileExists: boolean;
  handledRequestedFileId: string | null;
  selectedFileId: string | null;
  selectedAssetId: string | null;
  selectedFolderPath: string | null;
  activeFileId: string | null;
}): CaseResolverRequestedFileSyncResolution => {
  if (requestedFileId === null) {
    return {
      nextHandledRequestedFileId: null,
      shouldClearSelectedAsset: false,
      shouldClearSelectedFolder: false,
    };
  }

  if (requestedFileExists && handledRequestedFileId === requestedFileId) {
    return {
      nextHandledRequestedFileId: requestedFileId,
      shouldClearSelectedAsset: false,
      shouldClearSelectedFolder: false,
    };
  }

  const nextActiveFileId = resolveRequestedFileNextActiveFileId({
    requestedFileExists,
    requestedFileId,
  });
  return {
    nextHandledRequestedFileId: requestedFileExists ? requestedFileId : null,
    nextSelectedFileId: resolveRequestedFileNextSelectedFileId({
      requestedFileId,
      selectedFileId,
    }),
    shouldClearSelectedAsset: selectedAssetId !== null,
    shouldClearSelectedFolder: selectedFolderPath !== null,
    nextActiveFileId: activeFileId !== nextActiveFileId ? nextActiveFileId : undefined,
  };
};
