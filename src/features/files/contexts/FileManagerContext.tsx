'use client';

import React, { useState, useMemo, useCallback, ReactNode } from 'react';

import { useFileAsset3dList } from '@/features/files/hooks/useFileAsset3dQueries';
import {
  useFileQueries,
  useDeleteFile,
  useUpdateFileTags,
} from '@/features/files/hooks/useFileQueries';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products';
import type { Asset3DRecord, Asset3DListFilters } from '@/shared/contracts/viewer3d';
import { internalError } from '@/shared/errors/app-error';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  FileManagerActions,
  FileManagerConfig,
  FileManagerData,
  FileManagerSearch,
  FileManagerUIState,
} from './FileManagerContext.types';

export type {
  FileManagerActions,
  FileManagerConfig,
  FileManagerData,
  FileManagerSearch,
  FileManagerUIState,
} from './FileManagerContext.types';

// --- Granular Contexts ---
const {
  Context: ConfigContext,
  useStrictContext: useFileManagerConfigContext,
} = createStrictContext<FileManagerConfig>({
  hookName: 'useFileManagerConfig',
  providerName: 'FileManagerProvider',
  errorFactory: internalError,
});
export const useFileManagerConfig = useFileManagerConfigContext;

const {
  Context: SearchContext,
  useStrictContext: useFileManagerSearchContext,
} = createStrictContext<FileManagerSearch>({
  hookName: 'useFileManagerSearch',
  providerName: 'FileManagerProvider',
  errorFactory: internalError,
});
export const useFileManagerSearch = useFileManagerSearchContext;

const {
  Context: UIStateContext,
  useStrictContext: useFileManagerUIStateContext,
} = createStrictContext<FileManagerUIState>({
  hookName: 'useFileManagerUIState',
  providerName: 'FileManagerProvider',
  errorFactory: internalError,
});
export const useFileManagerUIState = useFileManagerUIStateContext;

const {
  Context: DataContext,
  useStrictContext: useFileManagerDataContext,
} = createStrictContext<FileManagerData>({
  hookName: 'useFileManagerData',
  providerName: 'FileManagerProvider',
  errorFactory: internalError,
});
export const useFileManagerData = useFileManagerDataContext;

const {
  Context: ActionsContext,
  useStrictContext: useFileManagerActionsContext,
} = createStrictContext<FileManagerActions>({
  hookName: 'useFileManagerActions',
  providerName: 'FileManagerProvider',
  errorFactory: internalError,
});
export const useFileManagerActions = useFileManagerActionsContext;

const normalizeTag = (tag: string): string => tag.trim().toLowerCase();
const parseTagInput = (input: string): string[] => {
  const raw = input.split(',').map(normalizeTag).filter(Boolean);
  return Array.from(new Set(raw));
};

export function FileManagerProvider(props: {
  children: ReactNode;
  onSelectFile?: (files: ImageFileSelection[]) => void;
  mode?: 'view' | 'select';
  selectionMode?: 'single' | 'multiple';
  autoConfirmSelection?: boolean;
  showFolderFilter?: boolean;
  defaultFolder?: string;
  showBulkActions?: boolean;
  showTagSearch?: boolean;
  filepathFilter?: (filepath: string) => boolean;
}): React.JSX.Element {
  const {
    children,
    onSelectFile,
    mode = 'select',
    selectionMode = 'multiple',
    autoConfirmSelection = false,
    showFolderFilter = false,
    defaultFolder,
    showBulkActions = false,
    showTagSearch = false,
    filepathFilter,
  } = props;

  const [filenameSearch, setFilenameSearch] = useState('');
  const [productNameSearch, setProductNameSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace'>('add');
  const [localFolderFilter, setLocalFolderFilter] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ExpandedImageFile | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'uploads' | 'links' | 'base64' | 'assets3d'>(
    'uploads'
  );
  const [selectedFiles, setSelectedFiles] = useState<ImageFileSelection[]>([]);

  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const deleteFileMutation = useDeleteFile();
  const updateTagsMutation = useUpdateFileTags();

  const enableTagSearch = showTagSearch || showBulkActions;
  const tagSearchList = useMemo(() => parseTagInput(tagSearch), [tagSearch]);

  const queryParams = useMemo(() => {
    const query = new URLSearchParams();
    if (filenameSearch) query.append('filename', filenameSearch);
    if (productNameSearch) query.append('productName', productNameSearch);
    if (enableTagSearch && tagSearchList.length > 0) query.append('tags', tagSearchList.join(','));
    return query.toString();
  }, [filenameSearch, productNameSearch, tagSearchList, enableTagSearch]);

  const { data: files = [] } = useFileQueries(queryParams);

  const visibleFiles = useMemo(
    (): ExpandedImageFile[] =>
      filepathFilter
        ? files.filter((file: ExpandedImageFile) => filepathFilter(file.filepath))
        : files,
    [files, filepathFilter]
  );

  const assetFilters = useMemo<Asset3DListFilters>(() => {
    const filters: Asset3DListFilters = { search: filenameSearch || null };
    if (enableTagSearch && tagSearchList.length > 0) {
      filters.tags = tagSearchList;
    }
    return filters;
  }, [enableTagSearch, filenameSearch, tagSearchList]);

  const { data: assets3d = [] } = useFileAsset3dList(assetFilters);

  const getFileKind = useCallback((filepath: string) => {
    const clean = (filepath || '').trim();
    if (!clean) return 'other';
    if (clean.startsWith('data:')) return 'base64';
    if (/^https?:\/\//i.test(clean)) {
      try {
        const url = new URL(clean);
        if (url.pathname.includes('/uploads/')) return 'upload';
      } catch (error) {
        logClientError(error);
        return 'link';
      }
      return 'link';
    }
    if (
      clean.includes('/uploads/') ||
      clean.startsWith('/uploads/') ||
      clean.startsWith('uploads/')
    )
      return 'upload';
    return 'other';
  }, []);

  const resolveFolder = useCallback(
    (filepath: string): string => {
      const kind = getFileKind(filepath);
      if (kind === 'base64') return 'base64';
      if (kind === 'link') {
        try {
          return new URL(filepath).hostname || 'link';
        } catch (error) {
          logClientError(error);
          return 'link';
        }
      }
      const clean = filepath.replace(/^\/+/, '');
      const parts = clean.split('/');
      if (parts.length === 0) return 'uploads';
      if (parts[0] === 'uploads') return parts[1] ?? 'uploads';
      return parts[0] || 'uploads';
    },
    [getFileKind]
  );

  const uploadFiles = useMemo(
    () =>
      visibleFiles.filter((file: ExpandedImageFile) => {
        const kind = getFileKind(file.filepath);
        return kind === 'upload' || kind === 'other';
      }),
    [visibleFiles, getFileKind]
  );

  const folderOptions = useMemo((): string[] => {
    const folders = new Set<string>();
    uploadFiles.forEach((file: ExpandedImageFile) => {
      if (file.filepath) folders.add(resolveFolder(file.filepath));
    });
    return ['all', ...Array.from(folders).sort()];
  }, [uploadFiles, resolveFolder]);

  const initialFolderFilter = useMemo((): string => {
    if (defaultFolder && folderOptions.includes(defaultFolder)) return defaultFolder;
    return 'all';
  }, [defaultFolder, folderOptions]);

  const folderFilter = localFolderFilter ?? initialFolderFilter;

  const tagOptions = useMemo((): string[] => {
    const tags = new Set<string>();
    visibleFiles.forEach((file: ExpandedImageFile) => {
      (file.tags ?? []).forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [visibleFiles]);

  const filterByTab = useMemo(() => {
    if (activeTab === 'links')
      return (file: ExpandedImageFile) => getFileKind(file.filepath) === 'link';
    if (activeTab === 'base64')
      return (file: ExpandedImageFile) => getFileKind(file.filepath) === 'base64';
    return (file: ExpandedImageFile) => {
      const kind = getFileKind(file.filepath);
      return kind === 'upload' || kind === 'other';
    };
  }, [activeTab, getFileKind]);

  const filteredFiles = useMemo((): ExpandedImageFile[] => {
    const base = visibleFiles.filter(filterByTab);
    if (activeTab !== 'uploads') return base;
    if (folderFilter === 'all') return base;
    return base.filter((file: ExpandedImageFile) => resolveFolder(file.filepath) === folderFilter);
  }, [visibleFiles, filterByTab, folderFilter, activeTab, resolveFolder]);

  const fileById = useMemo((): Map<string, ExpandedImageFile> => {
    return new Map(visibleFiles.map((file: ExpandedImageFile) => [file.id, file]));
  }, [visibleFiles]);

  const handleToggleSelect = useCallback(
    (file: ImageFileSelection): void => {
      setSelectedFiles((prev) => {
        const next =
          selectionMode === 'single'
            ? [file]
            : prev.some((f) => f.id === file.id)
              ? prev.filter((f) => f.id !== file.id)
              : [...prev, file];

        if (selectionMode === 'single' && autoConfirmSelection && onSelectFile) {
          onSelectFile(next);
        }
        return next;
      });
    },
    [selectionMode, autoConfirmSelection, onSelectFile]
  );

  const handleConfirmSelection = useCallback((): void => {
    if (onSelectFile) onSelectFile(selectedFiles);
  }, [onSelectFile, selectedFiles]);

  const handleSelectAll = useCallback((): void => {
    const toSelect = filteredFiles.map((file) => ({ id: file.id, filepath: file.filepath }));
    setSelectedFiles(toSelect);
  }, [filteredFiles]);

  const handleClearSelection = useCallback((): void => {
    setSelectedFiles([]);
  }, []);

  const handleDeleteSelected = useCallback(async (): Promise<void> => {
    if (selectedFiles.length === 0) return;
    confirm({
      title: 'Delete Selected Files?',
      message: `Are you sure you want to delete ${selectedFiles.length} selected file(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          for (const file of selectedFiles) {
            await deleteFileMutation.mutateAsync(file.id);
          }
          setSelectedFiles([]);
          toast('Selected files deleted.', { variant: 'success' });
        } catch (error) {
          logClientCatch(error, {
            source: 'FileManager',
            action: 'deleteSelected',
            count: selectedFiles.length,
          });
          toast('Failed to delete selected files.', { variant: 'error' });
        }
      },
    });
  }, [selectedFiles, deleteFileMutation, toast, confirm]);

  const handleApplyTags = useCallback(async (): Promise<void> => {
    const tags = parseTagInput(bulkTagInput);
    if (selectedFiles.length === 0) {
      toast('Select at least one file to tag.', { variant: 'info' });
      return;
    }
    if (tags.length === 0) {
      toast('Enter at least one tag.', { variant: 'info' });
      return;
    }
    try {
      await Promise.all(
        selectedFiles.map((file) => {
          const existing = fileById.get(file.id)?.tags ?? [];
          const nextTags =
            bulkTagMode === 'replace' ? tags : Array.from(new Set([...existing, ...tags]));
          return updateTagsMutation.mutateAsync({ id: file.id, tags: nextTags });
        })
      );
      toast('Tags updated.', { variant: 'success' });
      setBulkTagInput('');
    } catch (error) {
      logClientCatch(error, {
        source: 'FileManager',
        action: 'applyTags',
        count: selectedFiles.length,
      });
      toast('Failed to update tags.', { variant: 'error' });
    }
  }, [bulkTagInput, selectedFiles, bulkTagMode, fileById, updateTagsMutation, toast]);

  const handleDelete = useCallback(
    async (fileId: string): Promise<void> => {
      confirm({
        title: 'Delete File?',
        message: 'Are you sure you want to delete this file? This action cannot be undone.',
        confirmText: 'Delete',
        isDangerous: true,
        onConfirm: async () => {
          try {
            await deleteFileMutation.mutateAsync(fileId);
            toast('File deleted successfully.', { variant: 'success' });
          } catch (error) {
            logClientCatch(error, { source: 'FileManager', action: 'deleteFile', fileId });
            toast('Failed to delete file.', { variant: 'error' });
          }
        },
      });
    },
    [deleteFileMutation, toast, confirm]
  );

  const configValue = useMemo<FileManagerConfig>(
    () => ({
      mode,
      selectionMode,
      autoConfirmSelection,
      showFolderFilter,
      defaultFolder,
      showBulkActions,
      showTagSearch,
      onSelectFile,
    }),
    [
      mode,
      selectionMode,
      autoConfirmSelection,
      showFolderFilter,
      defaultFolder,
      showBulkActions,
      showTagSearch,
      onSelectFile,
    ]
  );

  const searchValue = useMemo<FileManagerSearch>(
    () => ({
      filenameSearch,
      setFilenameSearch,
      productNameSearch,
      setProductNameSearch,
      tagSearch,
      setTagSearch,
    }),
    [filenameSearch, productNameSearch, tagSearch]
  );

  const uiStateValue = useMemo<FileManagerUIState>(
    () => ({
      bulkTagInput,
      setBulkTagInput,
      bulkTagMode,
      setBulkTagMode,
      localFolderFilter,
      setLocalFolderFilter,
      previewFile,
      setPreviewFile,
      previewAsset,
      setPreviewAsset,
      activeTab,
      setActiveTab,
      selectedFiles,
    }),
    [
      bulkTagInput,
      bulkTagMode,
      localFolderFilter,
      previewFile,
      previewAsset,
      activeTab,
      selectedFiles,
    ]
  );

  const dataValue = useMemo<FileManagerData>(
    () => ({
      files,
      assets3d,
      folderOptions,
      tagOptions,
      filteredFiles,
      folderFilter,
      isPending: updateTagsMutation.isPending || deleteFileMutation.isPending,
    }),
    [
      files,
      assets3d,
      folderOptions,
      tagOptions,
      filteredFiles,
      folderFilter,
      updateTagsMutation.isPending,
      deleteFileMutation.isPending,
    ]
  );

  const actionsValue = useMemo<FileManagerActions>(
    () => ({
      handleToggleSelect,
      handleConfirmSelection,
      handleSelectAll,
      handleClearSelection,
      handleDeleteSelected,
      handleApplyTags,
      handleDelete,
      ConfirmationModal,
    }),
    [
      handleToggleSelect,
      handleConfirmSelection,
      handleSelectAll,
      handleClearSelection,
      handleDeleteSelected,
      handleApplyTags,
      handleDelete,
      ConfirmationModal,
    ]
  );

  return (
    <ConfigContext.Provider value={configValue}>
      <SearchContext.Provider value={searchValue}>
        <UIStateContext.Provider value={uiStateValue}>
          <DataContext.Provider value={dataValue}>
            <ActionsContext.Provider value={actionsValue}>{children}</ActionsContext.Provider>
          </DataContext.Provider>
        </UIStateContext.Provider>
      </SearchContext.Provider>
    </ConfigContext.Provider>
  );
}
