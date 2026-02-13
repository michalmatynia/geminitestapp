'use client';

import { ChevronRight, FolderOpen, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, SectionHeader, useToast } from '@/shared/ui';

import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
import { CaseResolverFolderTree } from '@/features/case-resolver/components/CaseResolverFolderTree';
import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  normalizeCaseResolverWorkspace,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
  renameFolderPath,
  upsertFileGraph,
} from '../settings';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverGraph,
  CaseResolverWorkspace,
} from '../types';

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const folderBaseName = (path: string): string => {
  const normalized = normalizeFolderPath(path);
  if (!normalized) return '';
  if (!normalized.includes('/')) return normalized;
  return normalized.slice(normalized.lastIndexOf('/') + 1);
};

const promptForName = (label: string, fallback: string): string | null => {
  const result = window.prompt(label, fallback);
  if (!result) return null;
  const normalized = result.trim();
  if (!normalized) return null;
  return normalized;
};

type UploadedCaseResolverAsset = {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string | null;
  size: number | null;
  originalName?: string | null;
};

export function AdminCaseResolverPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { isMenuCollapsed } = useAdminLayout();

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );

  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);

  useEffect(() => {
    setWorkspace(parsedWorkspace);
  }, [parsedWorkspace]);

  useEffect(() => {
    if (workspace.activeFileId && workspace.files.some((file) => file.id === workspace.activeFileId)) {
      return;
    }
    setWorkspace((prev: CaseResolverWorkspace) =>
      normalizeCaseResolverWorkspace({
        ...prev,
        activeFileId: prev.files[0]?.id ?? null,
      })
    );
  }, [workspace.activeFileId, workspace.files]);

  useEffect(() => {
    if (!selectedAssetId) return;
    if (workspace.assets.some((asset: CaseResolverAssetFile) => asset.id === selectedAssetId)) return;
    setSelectedAssetId(null);
  }, [selectedAssetId, workspace.assets]);

  const activeFile = useMemo(
    (): CaseResolverFile | null =>
      workspace.activeFileId
        ? workspace.files.find((file: CaseResolverFile) => file.id === workspace.activeFileId) ?? null
        : null,
    [workspace.activeFileId, workspace.files]
  );

  const serializedWorkspace = useMemo(
    () => JSON.stringify(workspace),
    [workspace]
  );
  const lastPersistedValueRef = useRef<string>(JSON.stringify(parsedWorkspace));

  useEffect(() => {
    if (serializedWorkspace === lastPersistedValueRef.current) return;
    const timer = window.setTimeout(() => {
      void updateSetting
        .mutateAsync({
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: serializedWorkspace,
        })
        .then(() => {
          lastPersistedValueRef.current = serializedWorkspace;
        })
        .catch((error: unknown) => {
          toast(
            error instanceof Error
              ? error.message
              : 'Failed to save Case Resolver workspace.',
            { variant: 'error' }
          );
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [serializedWorkspace, toast, updateSetting]);

  const updateWorkspace = useCallback(
    (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      setWorkspace((current: CaseResolverWorkspace) => {
        const next = normalizeCaseResolverWorkspace(updater(current));
        return next;
      });
    },
    []
  );

  const handleSelectFile = useCallback(
    (fileId: string): void => {
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        activeFileId: fileId,
      }));
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
    },
    [updateWorkspace]
  );

  const handleSelectAsset = useCallback((assetId: string): void => {
    setSelectedAssetId(assetId);
    setSelectedFolderPath(null);
  }, []);

  const handleSelectFolder = useCallback((folderPath: string | null): void => {
    setSelectedFolderPath(folderPath);
    setSelectedAssetId(null);
  }, []);

  const handleCreateFolder = useCallback(
    (targetFolderPath: string | null): void => {
      const folderName = promptForName('Folder name', 'new-folder');
      if (!folderName) return;
      const parent = normalizeFolderPath(targetFolderPath ?? '');
      const nextPath = normalizeFolderPath(parent ? `${parent}/${folderName}` : folderName);
      if (!nextPath) return;

      updateWorkspace((current: CaseResolverWorkspace) => {
        if (current.folders.includes(nextPath)) return current;
        return {
          ...current,
          folders: normalizeFolderPaths([...current.folders, nextPath]),
        };
      });
      setSelectedFolderPath(nextPath);
    },
    [updateWorkspace]
  );

  const handleCreateFile = useCallback(
    (targetFolderPath: string | null): void => {
      const fileName = promptForName('Case name', 'New Case');
      if (!fileName) return;
      const folder = normalizeFolderPath(targetFolderPath ?? '');
      const file = createCaseResolverFile({
        id: createId('case-file'),
        name: fileName,
        folder,
      });

      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: [...current.files, file],
        activeFileId: file.id,
        folders: normalizeFolderPaths([...current.folders, folder]),
      }));
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
    },
    [updateWorkspace]
  );

  const handleCreateNodeFile = useCallback(
    (targetFolderPath: string | null): void => {
      const fileName = promptForName('Node file name', 'Node File');
      if (!fileName) return;
      const folder = normalizeFolderPath(targetFolderPath ?? '');
      const asset = createCaseResolverAssetFile({
        id: createId('case-asset'),
        name: fileName,
        folder,
        kind: 'node_file',
        textContent: '',
      });

      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: [...current.assets, asset],
        folders: normalizeFolderPaths([...current.folders, folder]),
      }));
      setSelectedAssetId(asset.id);
      setSelectedFolderPath(null);
    },
    [updateWorkspace]
  );

  const handleUploadAssets = useCallback(
    async (files: File[], targetFolderPath: string | null): Promise<CaseResolverAssetFile[]> => {
      if (files.length === 0) return [];
      const folder = normalizeFolderPath(targetFolderPath ?? '');
      const formData = new FormData();
      files.forEach((file: File) => {
        formData.append('files', file);
      });
      formData.append('folder', folder);

      const response = await fetch('/api/case-resolver/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const fallbackMessage = `Upload failed (${response.status})`;
        let detail = fallbackMessage;
        try {
          const payload = await response.json() as { error?: string | { message?: string } };
          if (typeof payload.error === 'string') {
            detail = payload.error;
          } else if (payload.error && typeof payload.error.message === 'string') {
            detail = payload.error.message;
          }
        } catch {
          detail = fallbackMessage;
        }
        throw new Error(detail);
      }

      const payload = await response.json() as UploadedCaseResolverAsset | UploadedCaseResolverAsset[];
      const uploaded = Array.isArray(payload) ? payload : [payload];
      const nextAssets = uploaded.map((entry: UploadedCaseResolverAsset) =>
        createCaseResolverAssetFile({
          id: createId('case-asset'),
          name: (entry.originalName ?? '').trim() || entry.filename,
          folder,
          filepath: entry.filepath,
          sourceFileId: entry.id,
          mimeType: entry.mimetype,
          size: entry.size,
        })
      );

      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: [...current.assets, ...nextAssets],
        folders: normalizeFolderPaths([...current.folders, folder]),
      }));

      if (nextAssets[0]) {
        setSelectedAssetId(nextAssets[0].id);
      }
      setSelectedFolderPath(null);
      return nextAssets;
    },
    [updateWorkspace]
  );

  const handleMoveFile = useCallback(
    async (fileId: string, targetFolder: string): Promise<void> => {
      const normalizedTarget = normalizeFolderPath(targetFolder);
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: current.files.map((file: CaseResolverFile) =>
          file.id === fileId
            ? {
              ...file,
              folder: normalizedTarget,
              updatedAt: new Date().toISOString(),
            }
            : file
        ),
        folders: normalizeFolderPaths([...current.folders, normalizedTarget]),
      }));
    },
    [updateWorkspace]
  );

  const handleMoveAsset = useCallback(
    async (assetId: string, targetFolder: string): Promise<void> => {
      const normalizedTarget = normalizeFolderPath(targetFolder);
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: current.assets.map((asset: CaseResolverAssetFile) =>
          asset.id === assetId
            ? {
              ...asset,
              folder: normalizedTarget,
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
        folders: normalizeFolderPaths([...current.folders, normalizedTarget]),
      }));
    },
    [updateWorkspace]
  );

  const moveFolderInternal = useCallback(
    (current: CaseResolverWorkspace, sourceFolder: string, targetParent: string): CaseResolverWorkspace => {
      const normalizedSource = normalizeFolderPath(sourceFolder);
      const normalizedTargetParent = normalizeFolderPath(targetParent);
      const baseName = folderBaseName(normalizedSource);
      const destination = normalizeFolderPath(
        normalizedTargetParent ? `${normalizedTargetParent}/${baseName}` : baseName
      );

      if (!normalizedSource || !baseName) return current;
      if (destination === normalizedSource) return current;
      if (destination.startsWith(`${normalizedSource}/`)) return current;

      return {
        ...current,
        folders: normalizeFolderPaths(
          current.folders.map((folder: string) =>
            renameFolderPath(folder, normalizedSource, destination)
          )
        ),
        files: current.files.map((file: CaseResolverFile) => ({
          ...file,
          folder: renameFolderPath(file.folder, normalizedSource, destination),
          updatedAt:
            file.folder === renameFolderPath(file.folder, normalizedSource, destination)
              ? file.updatedAt
              : new Date().toISOString(),
        })),
        assets: current.assets.map((asset: CaseResolverAssetFile) => ({
          ...asset,
          folder: renameFolderPath(asset.folder, normalizedSource, destination),
          updatedAt:
            asset.folder === renameFolderPath(asset.folder, normalizedSource, destination)
              ? asset.updatedAt
              : new Date().toISOString(),
        })),
      };
    },
    []
  );

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string): Promise<void> => {
      updateWorkspace((current: CaseResolverWorkspace) =>
        moveFolderInternal(current, folderPath, targetFolder)
      );
    },
    [moveFolderInternal, updateWorkspace]
  );

  const handleRenameFolder = useCallback(
    async (folderPath: string, nextFolderPath: string): Promise<void> => {
      const normalizedSource = normalizeFolderPath(folderPath);
      const normalizedTarget = normalizeFolderPath(nextFolderPath);
      if (!normalizedSource || !normalizedTarget) return;
      if (normalizedSource === normalizedTarget) return;
      if (normalizedTarget.startsWith(`${normalizedSource}/`)) return;

      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        folders: normalizeFolderPaths(
          current.folders.map((folder: string) =>
            renameFolderPath(folder, normalizedSource, normalizedTarget)
          )
        ),
        files: current.files.map((file: CaseResolverFile) => {
          const nextFolder = renameFolderPath(file.folder, normalizedSource, normalizedTarget);
          if (nextFolder === file.folder) return file;
          return {
            ...file,
            folder: nextFolder,
            updatedAt: new Date().toISOString(),
          };
        }),
        assets: current.assets.map((asset: CaseResolverAssetFile) => {
          const nextFolder = renameFolderPath(asset.folder, normalizedSource, normalizedTarget);
          if (nextFolder === asset.folder) return asset;
          return {
            ...asset,
            folder: nextFolder,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));

      if (selectedFolderPath && renameFolderPath(selectedFolderPath, normalizedSource, normalizedTarget) !== selectedFolderPath) {
        setSelectedFolderPath(
          renameFolderPath(selectedFolderPath, normalizedSource, normalizedTarget)
        );
      }
    },
    [selectedFolderPath, updateWorkspace]
  );

  const handleRenameFile = useCallback(
    async (fileId: string, nextName: string): Promise<void> => {
      const normalizedName = nextName.trim();
      if (!normalizedName) return;
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: current.files.map((file: CaseResolverFile) =>
          file.id === fileId
            ? {
              ...file,
              name: normalizedName,
              updatedAt: new Date().toISOString(),
            }
            : file
        ),
      }));
    },
    [updateWorkspace]
  );

  const handleRenameAsset = useCallback(
    async (assetId: string, nextName: string): Promise<void> => {
      const normalizedName = nextName.trim();
      if (!normalizedName) return;
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: current.assets.map((asset: CaseResolverAssetFile) =>
          asset.id === assetId
            ? {
              ...asset,
              name: normalizedName,
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
      }));
    },
    [updateWorkspace]
  );

  const handleGraphChange = useCallback(
    (nextGraph: CaseResolverGraph): void => {
      if (!activeFile) return;
      updateWorkspace((current: CaseResolverWorkspace) =>
        upsertFileGraph(current, activeFile.id, nextGraph)
      );
    },
    [activeFile, updateWorkspace]
  );

  return (
    <div className='w-full space-y-4'>
      <SectionHeader
        title='Case Resolver'
        description='Build case text flows with folder-organized case files and AI Paths node mapping.'
      />

      {updateSetting.isPending ? (
        <div className='inline-flex items-center gap-2 rounded border border-border/60 bg-card/40 px-3 py-1 text-xs text-gray-300'>
          <Loader2 className='size-3.5 animate-spin' />
          Saving workspace...
        </div>
      ) : null}

      <div
        className={`grid gap-4 ${
          folderPanelCollapsed
            ? 'grid-cols-1'
            : isMenuCollapsed
              ? 'xl:grid-cols-[340px_minmax(0,1fr)]'
              : 'xl:grid-cols-[400px_minmax(0,1fr)]'
        }`}
      >
        {!folderPanelCollapsed ? (
          <div className='min-h-0 overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
            <CaseResolverFolderTree
              workspace={workspace}
              selectedFileId={selectedAssetId ? null : (activeFile?.id ?? null)}
              selectedAssetId={selectedAssetId}
              selectedFolderPath={selectedFolderPath}
              panelCollapsed={folderPanelCollapsed}
              onPanelCollapsedChange={setFolderPanelCollapsed}
              onSelectFile={handleSelectFile}
              onSelectAsset={handleSelectAsset}
              onSelectFolder={handleSelectFolder}
              onCreateFolder={handleCreateFolder}
              onCreateFile={handleCreateFile}
              onCreateNodeFile={handleCreateNodeFile}
              onUploadAssets={handleUploadAssets}
              onMoveFile={handleMoveFile}
              onMoveAsset={handleMoveAsset}
              onMoveFolder={handleMoveFolder}
              onRenameFile={handleRenameFile}
              onRenameAsset={handleRenameAsset}
              onRenameFolder={handleRenameFolder}
            />
          </div>
        ) : null}

        <div className='min-h-0'>
          {folderPanelCollapsed ? (
            <div className='mb-2'>
              <Button
                type='button'
                onClick={(): void => setFolderPanelCollapsed(false)}
                className='h-8 rounded-md border border-border text-xs text-gray-200 hover:bg-muted/60'
              >
                <FolderOpen className='mr-1 size-3.5' />
                Show Case Tree
                <ChevronRight className='ml-1 size-3.5 -scale-x-100' />
              </Button>
            </div>
          ) : null}

          {activeFile ? (
            <CaseResolverCanvasWorkspace
              fileId={activeFile.id}
              graph={activeFile.graph}
              defaultDropFolder={activeFile.folder}
              onUploadAssets={handleUploadAssets}
              onGraphChange={handleGraphChange}
            />
          ) : (
            <div className='flex h-[420px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/20 text-sm text-gray-400'>
              Create a case file to start mapping nodes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
