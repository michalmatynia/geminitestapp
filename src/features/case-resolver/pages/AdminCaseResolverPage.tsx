'use client';

import { ChevronRight, Eye, EyeOff, FileText, FolderOpen, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { CaseResolverCanvasWorkspace } from '@/features/case-resolver/components/CaseResolverCanvasWorkspace';
import { CaseResolverFileViewer } from '@/features/case-resolver/components/CaseResolverFileViewer';
import { CaseResolverFolderTree } from '@/features/case-resolver/components/CaseResolverFolderTree';
import { CaseResolverRichTextEditor } from '@/features/case-resolver/components/CaseResolverRichTextEditor';
import {
  CaseResolverPageProvider,
  type CaseResolverPageContextValue,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import {
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AppModal, Button, Input, Label, Textarea, SelectSimple, useToast } from '@/shared/ui';

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
  CaseResolverPartyReference,
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
  folder?: string | null;
  kind?: string | null;
};

type CaseResolverFileEditDraft = {
  id: string;
  name: string;
  folder: string;
  documentContent: string;
  addresser: CaseResolverPartyReference | null;
  addressee: CaseResolverPartyReference | null;
};

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';

const removeLinkedDocumentFileId = (
  graph: CaseResolverGraph,
  fileId: string
): CaseResolverGraph => {
  const source = graph.documentFileLinksByNode ?? {};
  let changed = false;
  const nextLinks: Record<string, string[]> = {};

  Object.entries(source).forEach(([nodeId, links]: [string, string[]]) => {
    const filtered = links.filter((linkedFileId: string) => linkedFileId !== fileId);
    if (filtered.length !== links.length) {
      changed = true;
    }
    nextLinks[nodeId] = filtered;
  });

  if (!changed) {
    return graph;
  }

  return {
    ...graph,
    documentFileLinksByNode: nextLinks,
  };
};

export function AdminCaseResolverPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { isMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawFilemakerDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const filemakerDatabase = useMemo(
    () => parseFilemakerDatabase(rawFilemakerDatabase),
    [rawFilemakerDatabase]
  );
  const filemakerPartyOptions = useMemo(
    () => buildFilemakerPartyOptions(filemakerDatabase),
    [filemakerDatabase]
  );

  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);
  const [isPreviewPageVisible, setIsPreviewPageVisible] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [editingDocumentDraft, setEditingDocumentDraft] = useState<CaseResolverFileEditDraft | null>(null);

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

  useEffect(() => {
    if (!editingDocumentDraft) return;
    if (workspace.files.some((file: CaseResolverFile) => file.id === editingDocumentDraft.id)) return;
    setEditingDocumentDraft(null);
  }, [editingDocumentDraft, workspace.files]);

  const activeFile = useMemo(
    (): CaseResolverFile | null =>
      workspace.activeFileId
        ? workspace.files.find((file: CaseResolverFile) => file.id === workspace.activeFileId) ?? null
        : null,
    [workspace.activeFileId, workspace.files]
  );
  const selectedAsset = useMemo(
    (): CaseResolverAssetFile | null =>
      selectedAssetId
        ? workspace.assets.find((asset: CaseResolverAssetFile) => asset.id === selectedAssetId) ?? null
        : null,
    [selectedAssetId, workspace.assets]
  );
  const isNodeFileSelected = selectedAsset?.kind === 'node_file';
  const shouldShowAssetPreview = Boolean(selectedAsset) && !isNodeFileSelected;
  const canTogglePreviewPage = isNodeFileSelected || Boolean(activeFile);
  const shouldShowPreviewPage = shouldShowAssetPreview || (canTogglePreviewPage && isPreviewPageVisible);

  useEffect(() => {
    if (!isPreviewPageVisible) return;
    if (canTogglePreviewPage || shouldShowAssetPreview) return;
    setIsPreviewPageVisible(false);
  }, [canTogglePreviewPage, isPreviewPageVisible, shouldShowAssetPreview]);

  useEffect(() => {
    if (activeFile) return;
    setIsPartiesModalOpen(false);
  }, [activeFile]);

  const serializedWorkspace = useMemo(
    () => JSON.stringify(workspace),
    [workspace]
  );
  const lastPersistedValueRef = useRef<string>(JSON.stringify(parsedWorkspace));
  const pendingSaveToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (serializedWorkspace === lastPersistedValueRef.current) return;
    const timer = window.setTimeout(() => {
      void (async (): Promise<void> => {
        try {
          await updateSetting.mutateAsync({
            key: CASE_RESOLVER_WORKSPACE_KEY,
            value: serializedWorkspace,
          });
          lastPersistedValueRef.current = serializedWorkspace;
          const pendingToast = pendingSaveToastRef.current;
          if (pendingToast) {
            toast(pendingToast, { variant: 'success' });
            pendingSaveToastRef.current = null;
          }
        } catch (error) {
          pendingSaveToastRef.current = null;
          toast(
            error instanceof Error
              ? error.message
              : 'Failed to save Case Resolver workspace.',
            { variant: 'error' }
          );
        }
      })();
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [serializedWorkspace, toast, updateSetting]);

  const updateWorkspace = useCallback(
    (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
      options?: { persistToast?: string }
    ): void => {
      setWorkspace((current: CaseResolverWorkspace) => {
        const updated = updater(current);
        if (updated === current) {
          return current;
        }
        if (options?.persistToast) {
          pendingSaveToastRef.current = options.persistToast;
        }
        const next = normalizeCaseResolverWorkspace(updated);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (!requestedFileId) return;
    if (!workspace.files.some((file: CaseResolverFile) => file.id === requestedFileId)) return;

    updateWorkspace((current: CaseResolverWorkspace) => {
      if (current.activeFileId === requestedFileId) {
        return current;
      }
      return {
        ...current,
        activeFileId: requestedFileId,
      };
    });
    setSelectedFolderPath((current: string | null) => (current === null ? current : null));
    setSelectedAssetId((current: string | null) => (current === null ? current : null));
  }, [requestedFileId, updateWorkspace, workspace.files]);

  const handleSelectFile = useCallback(
    (fileId: string): void => {
      updateWorkspace((current: CaseResolverWorkspace) => {
        if (current.activeFileId === fileId) {
          return current;
        }
        return {
          ...current,
          activeFileId: fileId,
        };
      });
      setSelectedFolderPath((current: string | null) => (current === null ? current : null));
      setSelectedAssetId((current: string | null) => (current === null ? current : null));
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
      }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
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
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
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
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
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

      try {
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
        const nextAssets = uploaded.map((entry: UploadedCaseResolverAsset) => {
          const resolvedFolder =
            typeof entry.folder === 'string' && entry.folder.trim().length > 0
              ? entry.folder
              : folder;
          return createCaseResolverAssetFile({
            id: createId('case-asset'),
            name: (entry.originalName ?? '').trim() || entry.filename,
            folder: resolvedFolder,
            kind: entry.kind,
            filepath: entry.filepath,
            sourceFileId: entry.id,
            mimeType: entry.mimetype,
            size: entry.size,
          });
        });
        const uploadedFolders = nextAssets.map((asset: CaseResolverAssetFile) => asset.folder);

        updateWorkspace((current: CaseResolverWorkspace) => ({
          ...current,
          assets: [...current.assets, ...nextAssets],
          folders: normalizeFolderPaths([...current.folders, ...uploadedFolders]),
        }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

        if (nextAssets[0]) {
          setSelectedAssetId(nextAssets[0].id);
        }
        setSelectedFolderPath(null);
        return nextAssets;
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : 'An unknown error occurred during asset upload.',
          { variant: 'error' }
        );
        return [];
      }
    },
    [toast, updateWorkspace]
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
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
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
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
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
      updateWorkspace(
        (current: CaseResolverWorkspace) =>
          moveFolderInternal(current, folderPath, targetFolder),
        { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
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
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

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
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
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
      }), { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
    },
    [updateWorkspace]
  );

  const handleOpenFileEditor = useCallback(
    (fileId: string): void => {
      try {
        const target = workspace.files.find((file: CaseResolverFile) => file.id === fileId);
        if (!target) {
          toast('File not found.', { variant: 'warning' });
          return;
        }

        setEditingDocumentDraft({
          id: target.id,
          name: target.name,
          folder: target.folder,
          documentContent: target.documentContent,
          addresser: target.addresser,
          addressee: target.addressee,
        });
        setSelectedAssetId(null);
        setSelectedFolderPath(null);
        updateWorkspace((current: CaseResolverWorkspace) => {
          if (current.activeFileId === fileId) {
            return current;
          }
          return {
            ...current,
            activeFileId: fileId,
          };
        });
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : 'An unknown error occurred while opening the file editor.',
          { variant: 'error' }
        );
      }
    },
    [toast, updateWorkspace, workspace.files]
  );

  const handleCloseFileEditor = useCallback((): void => {
    setEditingDocumentDraft(null);
  }, []);

  const handleToggleFileLock = useCallback(
    (fileId: string): void => {
      updateWorkspace(
        (current: CaseResolverWorkspace): CaseResolverWorkspace => {
          let hasChanged = false;
          const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
            if (file.id !== fileId) return file;
            hasChanged = true;
            return {
              ...file,
              isLocked: !file.isLocked,
              updatedAt: new Date().toISOString(),
            };
          });
          if (!hasChanged) return current;
          return {
            ...current,
            files: nextFiles,
          };
        },
        { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
      );
    },
    [updateWorkspace]
  );

  const handleDeleteFile = useCallback(
    (fileId: string): void => {
      const target = workspace.files.find((file: CaseResolverFile) => file.id === fileId);
      if (!target) return;
      if (target.isLocked) {
        toast('File is locked. Unlock it before removing.', { variant: 'warning' });
        return;
      }

      updateWorkspace(
        (current: CaseResolverWorkspace): CaseResolverWorkspace => {
          let hasChanged = false;
          const nextFiles = current.files
            .filter((file: CaseResolverFile): boolean => {
              if (file.id === fileId) {
                hasChanged = true;
                return false;
              }
              return true;
            })
            .map((file: CaseResolverFile): CaseResolverFile => {
              const nextGraph = removeLinkedDocumentFileId(file.graph, fileId);
              if (nextGraph === file.graph) {
                return file;
              }
              return {
                ...file,
                graph: nextGraph,
                updatedAt: new Date().toISOString(),
              };
            });

          if (!hasChanged) return current;

          return {
            ...current,
            files: nextFiles,
            activeFileId:
              current.activeFileId === fileId
                ? (nextFiles[0]?.id ?? null)
                : current.activeFileId,
          };
        },
        { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
      );

      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
        current?.id === fileId ? null : current
      );
    },
    [toast, updateWorkspace, workspace.files]
  );

  const handleSaveFileEditor = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const normalizedName = editingDocumentDraft.name.trim();
    if (!normalizedName) {
      toast('Document name is required.', { variant: 'error' });
      return;
    }
    const normalizedFolder = normalizeFolderPath(editingDocumentDraft.folder);
    const now = new Date().toISOString();

    updateWorkspace(
      (current: CaseResolverWorkspace): CaseResolverWorkspace => ({
        ...current,
        files: current.files.map((file: CaseResolverFile): CaseResolverFile =>
          file.id === editingDocumentDraft.id
            ? {
              ...file,
              name: normalizedName,
              folder: normalizedFolder,
              documentContent: editingDocumentDraft.documentContent,
              addresser: editingDocumentDraft.addresser,
              addressee: editingDocumentDraft.addressee,
              updatedAt: now,
            }
            : file
        ),
        folders: normalizeFolderPaths([...current.folders, normalizedFolder]),
      }),
      { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST }
    );

    setEditingDocumentDraft(null);
  }, [editingDocumentDraft, toast, updateWorkspace]);

  const handleUpdateSelectedAsset = useCallback(
    (patch: Partial<Pick<CaseResolverAssetFile, 'textContent' | 'description'>>): void => {
      if (!selectedAssetId) return;
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        assets: current.assets.map((asset: CaseResolverAssetFile) =>
          asset.id === selectedAssetId
            ? {
              ...asset,
              ...(typeof patch.textContent === 'string' ? { textContent: patch.textContent } : {}),
              ...(typeof patch.description === 'string' ? { description: patch.description } : {}),
              updatedAt: new Date().toISOString(),
            }
            : asset
        ),
      }));
    },
    [selectedAssetId, updateWorkspace]
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

  const handleUpdateActiveFileParties = useCallback(
    (patch: Partial<Pick<CaseResolverFile, 'addresser' | 'addressee'>>): void => {
      if (!activeFile) return;
      updateWorkspace((current: CaseResolverWorkspace) => ({
        ...current,
        files: current.files.map((file: CaseResolverFile) =>
          file.id === activeFile.id
            ? {
              ...file,
              ...(patch.addresser !== undefined ? { addresser: patch.addresser } : {}),
              ...(patch.addressee !== undefined ? { addressee: patch.addressee } : {}),
              updatedAt: new Date().toISOString(),
            }
            : file
        ),
      }));
    },
    [activeFile, updateWorkspace]
  );

  const caseResolverPageContextValue: CaseResolverPageContextValue = {
    workspace,
    selectedFileId: selectedAssetId ? null : (activeFile?.id ?? null),
    selectedAssetId,
    selectedFolderPath,
    panelCollapsed: folderPanelCollapsed,
    onPanelCollapsedChange: setFolderPanelCollapsed,
    onSelectFile: handleSelectFile,
    onSelectAsset: handleSelectAsset,
    onSelectFolder: handleSelectFolder,
    onCreateFolder: handleCreateFolder,
    onCreateFile: handleCreateFile,
    onCreateNodeFile: handleCreateNodeFile,
    onUploadAssets: handleUploadAssets,
    onMoveFile: handleMoveFile,
    onMoveAsset: handleMoveAsset,
    onMoveFolder: handleMoveFolder,
    onRenameFile: handleRenameFile,
    onRenameAsset: handleRenameAsset,
    onRenameFolder: handleRenameFolder,
    onDeleteFile: handleDeleteFile,
    onToggleFileLock: handleToggleFileLock,
    onEditFile: handleOpenFileEditor,
    activeFile,
    selectedAsset,
    onUpdateSelectedAsset: handleUpdateSelectedAsset,
    onGraphChange: handleGraphChange,
  };

  return (
    <CaseResolverPageProvider value={caseResolverPageContextValue}>
      <div className='w-full space-y-4'>
        <div
          className={`grid gap-4 ${
            folderPanelCollapsed
              ? 'grid-cols-1'
              : isMenuCollapsed
                ? 'lg:grid-cols-[320px_minmax(0,1fr)]'
                : 'lg:grid-cols-[360px_minmax(0,1fr)]'
          }`}
        >
          {!folderPanelCollapsed ? (
            <div className='min-h-0 overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
              <CaseResolverFolderTree />
            </div>
          ) : null}

          <div className='min-h-0 w-full'>
            {folderPanelCollapsed || canTogglePreviewPage ? (
              <div className='mb-2 flex flex-wrap items-center gap-2'>
                {folderPanelCollapsed ? (
                  <Button
                    type='button'
                    onClick={(): void => setFolderPanelCollapsed(false)}
                    className='h-8 rounded-md border border-border text-xs text-gray-200 hover:bg-muted/60'
                  >
                    <FolderOpen className='mr-1 size-3.5' />
                  Show Case Tree
                    <ChevronRight className='ml-1 size-3.5 -scale-x-100' />
                  </Button>
                ) : null}
                {canTogglePreviewPage ? (
                  <Button
                    type='button'
                    onClick={(): void => setIsPreviewPageVisible((current) => !current)}
                    title={shouldShowPreviewPage && !shouldShowAssetPreview ? 'Return to editor' : 'Show preview page'}
                    aria-label={shouldShowPreviewPage && !shouldShowAssetPreview ? 'Return to editor' : 'Show preview page'}
                    className='h-8 w-8 rounded-md border border-border px-0 text-gray-200 hover:bg-muted/60'
                  >
                    {shouldShowPreviewPage && !shouldShowAssetPreview ? (
                      <EyeOff className='size-3.5' />
                    ) : (
                      <Eye className='size-3.5' />
                    )}
                  </Button>
                ) : null}
                {activeFile ? (
                  <Button
                    type='button'
                    onClick={(): void => {
                      setIsPreviewPageVisible(false);
                      handleOpenFileEditor(activeFile.id);
                    }}
                    title='Open document editor'
                    aria-label='Open document editor'
                    className='h-8 w-8 rounded-md border border-border px-0 text-gray-200 hover:bg-muted/60'
                  >
                    <FileText className='size-3.5' />
                  </Button>
                ) : null}
                {activeFile ? (
                  <Button
                    type='button'
                    onClick={(): void => {
                      setIsPartiesModalOpen(true);
                    }}
                    className='h-8 rounded-md border border-border px-2 text-xs text-gray-200 hover:bg-muted/60'
                  >
                    <Users className='mr-1 size-3.5' />
                  Parties
                  </Button>
                ) : null}
              </div>
            ) : null}

            {selectedAsset && isNodeFileSelected && !shouldShowPreviewPage ? (
              <div className='mb-3 space-y-3 rounded-lg border border-border/60 bg-card/35 p-4'>
                <div className='space-y-1'>
                  <div className='text-sm font-semibold text-white'>Asset Editor</div>
                  <div className='text-[11px] text-gray-400'>
                  Edit reusable node-file text. Dropping this asset as WYSIWYG Text Node will use this content.
                  </div>
                </div>

                <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-300'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Asset</span>
                    <span className='font-medium text-gray-100'>{selectedAsset.name}</span>
                  </div>
                  <div className='mt-1 flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Kind</span>
                    <span className='uppercase text-[10px] text-gray-200'>{selectedAsset.kind}</span>
                  </div>
                  <div className='mt-1 flex items-center justify-between gap-2'>
                    <span className='text-gray-500'>Folder</span>
                    <span className='font-mono text-[10px] text-gray-300'>
                      {selectedAsset.folder || '(root)'}
                    </span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Description</Label>
                  <Textarea
                    value={selectedAsset.description}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                      handleUpdateSelectedAsset({ description: event.target.value });
                    }}
                    className='min-h-[72px] border-border bg-card/60 text-xs text-white'
                    placeholder='Optional description to keep file context.'
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-400'>Node File Text (WYSIWYG)</Label>
                  <CaseResolverRichTextEditor
                    value={selectedAsset.textContent}
                    onChange={(nextValue: string): void => {
                      handleUpdateSelectedAsset({ textContent: nextValue });
                    }}
                    placeholder='Write reusable prompt fragments in this node file...'
                  />
                </div>
              </div>
            ) : null}

            {shouldShowPreviewPage ? (
              <CaseResolverFileViewer />
            ) : activeFile ? (
              <CaseResolverCanvasWorkspace />
            ) : (
              <CaseResolverFileViewer />
            )}
          </div>
        </div>

        <AppModal
          open={isPartiesModalOpen && Boolean(activeFile)}
          onOpenChange={(open: boolean): void => {
            setIsPartiesModalOpen(open);
          }}
          title='Case Parties'
          subtitle='Manage addresser and addressee for the active case.'
          size='lg'
        >
          {activeFile ? (
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Addresser</Label>
                <SelectSimple size='sm'
                  value={encodeFilemakerPartyReference(activeFile.addresser)}
                  onValueChange={(value: string): void => {
                    handleUpdateActiveFileParties({
                      addresser: decodeFilemakerPartyReference(value),
                    });
                  }}
                  options={filemakerPartyOptions}
                  placeholder='Select addresser'
                  triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                />
                <div className='text-[11px] text-gray-500'>
                  {resolveFilemakerPartyLabel(filemakerDatabase, activeFile.addresser) ?? 'No addresser selected.'}
                </div>
              </div>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Addressee</Label>
                <SelectSimple size='sm'
                  value={encodeFilemakerPartyReference(activeFile.addressee)}
                  onValueChange={(value: string): void => {
                    handleUpdateActiveFileParties({
                      addressee: decodeFilemakerPartyReference(value),
                    });
                  }}
                  options={filemakerPartyOptions}
                  placeholder='Select addressee'
                  triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                />
                <div className='text-[11px] text-gray-500'>
                  {resolveFilemakerPartyLabel(filemakerDatabase, activeFile.addressee) ?? 'No addressee selected.'}
                </div>
              </div>
            </div>
          ) : null}
        </AppModal>

        <AppModal
          open={editingDocumentDraft !== null}
          onOpenChange={(open: boolean): void => {
            if (!open) {
              handleCloseFileEditor();
            }
          }}
          title='Edit Document File'
          subtitle='Edit case file metadata and WYSIWYG content.'
          size='xl'
          footer={(
            <>
              <Button
                type='button'
                variant='outline'
                onClick={handleCloseFileEditor}
              >
              Cancel
              </Button>
              <Button
                type='button'
                onClick={handleSaveFileEditor}
              >
              Save
              </Button>
            </>
          )}
        >
          {editingDocumentDraft ? (
            <div className='space-y-4'>
              <div className='grid gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Document Name</Label>
                  <Input
                    value={editingDocumentDraft.name}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const nextName = event.target.value;
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            name: nextName,
                          }
                          : current
                      );
                    }}
                    className='h-9 border-border bg-card/60 text-sm text-white'
                    placeholder='Document name'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Folder</Label>
                  <Input
                    value={editingDocumentDraft.folder}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const nextFolder = event.target.value;
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            folder: nextFolder,
                          }
                          : current
                      );
                    }}
                    className='h-9 border-border bg-card/60 text-sm text-white'
                    placeholder='Folder (optional)'
                  />
                </div>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Addresser</Label>
                  <SelectSimple size='sm'
                    value={encodeFilemakerPartyReference(editingDocumentDraft.addresser)}
                    onValueChange={(value: string): void => {
                      const nextAddresser = decodeFilemakerPartyReference(value);
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            addresser: nextAddresser,
                          }
                          : current
                      );
                    }}
                    options={filemakerPartyOptions}
                    placeholder='Select addresser'
                    triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-gray-400'>Addressee</Label>
                  <SelectSimple size='sm'
                    value={encodeFilemakerPartyReference(editingDocumentDraft.addressee)}
                    onValueChange={(value: string): void => {
                      const nextAddressee = decodeFilemakerPartyReference(value);
                      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                        current
                          ? {
                            ...current,
                            addressee: nextAddressee,
                          }
                          : current
                      );
                    }}
                    options={filemakerPartyOptions}
                    placeholder='Select addressee'
                    triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs text-gray-400'>Document Content (WYSIWYG)</Label>
                <CaseResolverRichTextEditor
                  value={editingDocumentDraft.documentContent}
                  onChange={(nextValue: string): void => {
                    setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) =>
                      current
                        ? {
                          ...current,
                          documentContent: nextValue,
                        }
                        : current
                    );
                  }}
                  placeholder='Write or edit this document with rich text formatting...'
                />
              </div>
            </div>
          ) : null}
        </AppModal>
      </div>
    </CaseResolverPageProvider>
  );
}
