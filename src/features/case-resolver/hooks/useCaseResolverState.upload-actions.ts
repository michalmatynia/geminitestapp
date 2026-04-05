'use client';

import { useCallback } from 'react';

import {
  createId,
  isLikelyImageFile,
  isLikelyScanInputFile,
} from '@/features/case-resolver/utils/caseResolverUtils';
import type { CaseResolverAssetFile, CaseResolverFile, CaseResolverFileEditDraft } from '@/shared/contracts/case-resolver/file';
import type { CaseResolverAssetKind } from '@/shared/contracts/case-resolver/base';
import type { CaseResolverScanSlot } from '@/shared/contracts/case-resolver/ocr';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';
import type { Toast } from '@/shared/contracts/ui/base';

import {
  createCaseResolverAssetFile,
  inferCaseResolverAssetKind,
  normalizeFolderPath,
  normalizeFolderPaths,
} from '../settings';
import {
  normalizeUploadedCaseResolverFile,
  resolveUploadBaseFolder,
  type CaseResolverUploadedFile,
} from './useCaseResolverState.helpers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



export interface UseCaseResolverStateUploadActionsValue {
  handleUploadScanFiles: (fileId: string, files: File[]) => Promise<void>;
  handleUploadAssets: (
    files: File[],
    targetFolderPath: string | null
  ) => Promise<CaseResolverAssetFile[]>;
  handleAttachAssetFile: (
    assetId: string,
    file: File,
    options?: { expectedKind?: CaseResolverAssetKind | null }
  ) => Promise<CaseResolverAssetFile>;
  uploadSourceFileToCaseResolver: (
    sourceFile: File,
    targetFolderPath: string
  ) => Promise<CaseResolverUploadedFile>;
}

export function useCaseResolverStateUploadActions({
  toast,
  updateWorkspace,
  workspace,
  setEditingDocumentDraft,
  setSelectedFileId,
  setSelectedAssetId,
  setSelectedFolderPath,
  treeSaveToast,
}: {
  toast: Toast;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: {
      persistToast?: string;
      persistNow?: boolean;
      mutationId?: string;
      source?: string;
      skipNormalization?: boolean;
    }
  ) => void;
  workspace: CaseResolverWorkspace;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  treeSaveToast: string;
}): UseCaseResolverStateUploadActionsValue {
  const uploadSourceFileToCaseResolver = useCallback(
    async (sourceFile: File, targetFolderPath: string): Promise<CaseResolverUploadedFile> => {
      const uploadFormData = new FormData();
      uploadFormData.append('folder', targetFolderPath);
      uploadFormData.append('file', sourceFile);
      const uploadResponse = await fetch('/api/case-resolver/assets/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadResponse.ok) {
        const fallbackMessage = `Failed to upload file (${uploadResponse.status})`;
        const errorBody = await uploadResponse.text();
        throw new Error(errorBody || fallbackMessage);
      }
      const uploadPayload = (await uploadResponse.json()) as unknown;
      const firstEntry: unknown = Array.isArray(uploadPayload)
        ? (uploadPayload[0] ?? null)
        : uploadPayload;
      return normalizeUploadedCaseResolverFile(firstEntry, sourceFile, targetFolderPath);
    },
    []
  );

  const handleUploadScanFiles = useCallback(
    async (fileId: string, files: File[]): Promise<void> => {
      const targetFile = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === fileId
      );
      if (targetFile?.fileType !== 'scanfile') {
        throw new Error('Scan file no longer exists.');
      }
      if (targetFile.isLocked) {
        throw new Error('Document is locked. Unlock it before uploading files.');
      }

      const sourceFiles = files.filter(
        (file: File): boolean => file instanceof File && file.size >= 0
      );
      if (sourceFiles.length === 0) return;

      const normalizedFolder = normalizeFolderPath(targetFile.folder);
      const createdSlots: CaseResolverScanSlot[] = [];
      const createdFolders = new Set<string>();
      const failedFiles: string[] = [];

      for (const sourceFile of sourceFiles) {
        if (!isLikelyScanInputFile(sourceFile)) {
          failedFiles.push(`${sourceFile.name || 'file'}: Only image and PDF files are supported.`);
          continue;
        }
        const inferredKind = inferCaseResolverAssetKind({
          mimeType: sourceFile.type,
          name: sourceFile.name,
        });
        if (inferredKind !== 'image' && inferredKind !== 'pdf') {
          failedFiles.push(`${sourceFile.name || 'file'}: Only image and PDF files are supported.`);
          continue;
        }
        try {
          const uploadBaseFolder = resolveUploadBaseFolder(normalizedFolder, inferredKind);
          const uploaded = await uploadSourceFileToCaseResolver(sourceFile, uploadBaseFolder);
          createdSlots.push({
            id: createId('scan-slot'),
            fileId: uploaded.id || '',
            status: 'completed',
            progress: 100,
            name: uploaded.originalName || sourceFile.name || 'file',
            filepath: uploaded.filepath || '',
            sourceFileId: uploaded.id || '',
            mimeType: uploaded.mimetype || sourceFile.type,
            size: uploaded.size || sourceFile.size || 0,
            ocrText: '',
            ocrError: null,
          });
          createdFolders.add(normalizeFolderPath(uploaded.folder || normalizedFolder));
        } catch (error: unknown) {
          logClientError(error);
          failedFiles.push(
            `${sourceFile.name || 'file'}: ${
              error instanceof Error ? error.message : 'Upload failed'
            }`
          );
        }
      }

      if (createdSlots.length > 0) {
        let didAttachSlots = false;
        let attachBlockedByLock = false;
        updateWorkspace(
          (current: CaseResolverWorkspace) => {
            const now = new Date().toISOString();
            let didUpdate = false;
            const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
              if (file.id !== fileId || file.fileType !== 'scanfile') return file;
              if (file.isLocked) {
                attachBlockedByLock = true;
                return file;
              }
              didUpdate = true;
              return {
                ...file,
                scanSlots: [...(file.scanSlots ?? []), ...createdSlots],
                updatedAt: now,
              };
            });
            didAttachSlots = didUpdate;
            if (!didUpdate) return current;
            return {
              ...current,
              files: nextFiles,
              folders: normalizeFolderPaths([...current.folders, ...Array.from(createdFolders)]),
            };
          },
          { persistToast: treeSaveToast }
        );
        setEditingDocumentDraft((current) => {
          if (current?.id !== fileId || current?.fileType !== 'scanfile') return current;
          if (current.isLocked) return current;
          return {
            ...current,
            scanSlots: [...(current.scanSlots ?? []), ...createdSlots],
            updatedAt: new Date().toISOString(),
          };
        });
        if (didAttachSlots) {
          toast('Files uploaded.', { variant: 'success' });
        } else if (attachBlockedByLock) {
          toast('Document was locked before uploaded files could be attached.', {
            variant: 'warning',
          });
        }
      }

      if (failedFiles.length > 0) {
        toast(
          failedFiles.length === 1
            ? (failedFiles[0] ?? 'Failed to upload file.')
            : `${failedFiles.length} files failed to upload.`,
          { variant: 'error' }
        );
      }
    },
    [
      toast,
      treeSaveToast,
      updateWorkspace,
      uploadSourceFileToCaseResolver,
      workspace.files,
      setEditingDocumentDraft,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
    ]
  );

  const handleUploadAssets = useCallback(
    async (files: File[], targetFolderPath: string | null): Promise<CaseResolverAssetFile[]> => {
      const sourceFiles = files.filter(
        (file: File): boolean => file instanceof File && file.size >= 0
      );
      if (sourceFiles.length === 0) return [];

      const normalizedFolder = normalizeFolderPath(targetFolderPath ?? '');
      const createdAssets: CaseResolverAssetFile[] = [];
      const failedFiles: string[] = [];

      for (const sourceFile of sourceFiles) {
        try {
          const inferredKind = inferCaseResolverAssetKind({
            mimeType: sourceFile.type,
            name: sourceFile.name,
          });
          const uploadBaseFolder = resolveUploadBaseFolder(normalizedFolder, inferredKind);
          const uploaded = await uploadSourceFileToCaseResolver(sourceFile, uploadBaseFolder);
          const fallbackName = sourceFile.name.trim() || `File ${createdAssets.length + 1}`;
          const assetName = uploaded.originalName.trim() || fallbackName;

          createdAssets.push(
            createCaseResolverAssetFile({
              id: createId('asset'),
              name: assetName,
              folder: uploaded.folder || normalizedFolder,
              kind: uploaded.kind,
              filepath: uploaded.filepath,
              sourceFileId: uploaded.id,
              mimeType: uploaded.mimetype,
              size: uploaded.size,
            })
          );
        } catch (error: unknown) {
          logClientError(error);
          failedFiles.push(
            `${sourceFile.name || 'file'}: ${error instanceof Error ? error.message : 'Upload failed'}`
          );
        }
      }

      if (createdAssets.length > 0) {
        updateWorkspace(
          (current: CaseResolverWorkspace) => ({
            ...current,
            assets: [...current.assets, ...createdAssets],
            folders: normalizeFolderPaths([
              ...current.folders,
              ...createdAssets.map((asset: CaseResolverAssetFile): string => asset.folder),
            ]),
          }),
          { persistToast: treeSaveToast }
        );
      }

      if (failedFiles.length > 0) {
        toast(
          failedFiles.length === 1
            ? (failedFiles[0] ?? 'Failed to upload file.')
            : `${failedFiles.length} files failed to upload.`,
          { variant: 'error' }
        );
      }

      if (createdAssets.length === 0 && failedFiles.length > 0) {
        throw new Error(failedFiles[0] ?? 'Failed to upload files.');
      }

      return createdAssets;
    },
    [toast, treeSaveToast, updateWorkspace, uploadSourceFileToCaseResolver]
  );

  const handleAttachAssetFile = useCallback(
    async (
      assetId: string,
      file: File,
      options?: { expectedKind?: CaseResolverAssetKind | null }
    ): Promise<CaseResolverAssetFile> => {
      const currentAsset = workspace.assets.find(
        (asset: CaseResolverAssetFile): boolean => asset.id === assetId
      );
      if (!currentAsset) {
        throw new Error('Asset placeholder no longer exists.');
      }

      const expectedKind = options?.expectedKind ?? currentAsset.kind;
      if (expectedKind === 'image' && !isLikelyImageFile(file)) {
        throw new Error('Please upload an image file for this image placeholder.');
      }

      const uploadFolder = normalizeFolderPath(currentAsset.folder);
      const uploadBaseFolder = resolveUploadBaseFolder(uploadFolder, expectedKind);
      const uploaded = await uploadSourceFileToCaseResolver(file, uploadBaseFolder);
      const uploadedKind = inferCaseResolverAssetKind({
        kind: uploaded.kind,
        mimeType: uploaded.mimetype,
        name: uploaded.originalName,
      });
      if (expectedKind && expectedKind !== 'file' && uploadedKind !== expectedKind) {
        throw new Error(`Uploaded file type does not match this ${expectedKind} placeholder.`);
      }

      const now = new Date().toISOString();
      const resolvedKind = expectedKind && expectedKind !== 'file' ? expectedKind : uploadedKind;
      const updatedAsset: CaseResolverAssetFile = {
        ...currentAsset,
        folder: normalizeFolderPath(uploaded.folder || uploadFolder),
        kind: resolvedKind,
        filepath: uploaded.filepath,
        sourceFileId: uploaded.id,
        mimeType: uploaded.mimetype,
        size: uploaded.size,
        updatedAt: now,
      };
      updateWorkspace(
        (current: CaseResolverWorkspace): CaseResolverWorkspace => {
          let didUpdate = false;
          const nextAssets = current.assets.map(
            (asset: CaseResolverAssetFile): CaseResolverAssetFile => {
              if (asset.id !== assetId) return asset;
              didUpdate = true;
              return updatedAsset;
            }
          );
          if (!didUpdate) return current;
          return {
            ...current,
            assets: nextAssets,
            folders: normalizeFolderPaths([
              ...current.folders,
              normalizeFolderPath(uploaded.folder || uploadFolder) || '',
            ]),
          };
        },
        { persistToast: treeSaveToast }
      );

      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(updatedAsset.id);
      toast('File attached.', { variant: 'success' });
      return updatedAsset;
    },
    [
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      toast,
      treeSaveToast,
      updateWorkspace,
      uploadSourceFileToCaseResolver,
      workspace.assets,
    ]
  );

  return {
    handleUploadScanFiles,
    handleUploadAssets,
    handleAttachAssetFile,
    uploadSourceFileToCaseResolver,
  };
}
