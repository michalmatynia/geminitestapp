'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';

import {
  useFileQueries,
  useDeleteFile,
  useUpdateFileTags,
} from '@/features/files/hooks/useFileQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { ExpandedImageFile } from '@/features/products';
import { useAssets3D } from '@/features/viewer3d/hooks/useAsset3dQueries';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { Asset3DRecord, Asset3DListFilters } from '@/shared/contracts/viewer3d';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';

// --- Granular Contexts ---

export interface FileManagerConfig {
  mode: 'view' | 'select';
  selectionMode: 'single' | 'multiple';
  autoConfirmSelection: boolean;
  showFolderFilter: boolean;
  defaultFolder: string | undefined;
  showBulkActions: boolean;
  showTagSearch: boolean;
  onSelectFile: ((files: ImageFileSelection[]) => void) | undefined;
}
const ConfigContext = createContext<FileManagerConfig | null>(null);
export const useFileManagerConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useFileManagerConfig must be used within FileManagerProvider');
  return context;
};

export interface FileManagerSearch {
  filenameSearch: string;
  setFilenameSearch: (val: string) => void;
  productNameSearch: string;
  setProductNameSearch: (val: string) => void;
  tagSearch: string;
  setTagSearch: (val: string) => void;
}
const SearchContext = createContext<FileManagerSearch | null>(null);
export const useFileManagerSearch = () => {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useFileManagerSearch must be used within FileManagerProvider');
  return context;
};

export interface FileManagerUIState {
  bulkTagInput: string;
  setBulkTagInput: (val: string) => void;
  bulkTagMode: 'add' | 'replace';
  setBulkTagMode: (val: 'add' | 'replace') => void;
  localFolderFilter: string | null;
  setLocalFolderFilter: (val: string | null) => void;
  previewFile: ExpandedImageFile | null;
  setPreviewFile: (val: ExpandedImageFile | null) => void;
  previewAsset: Asset3DRecord | null;
  setPreviewAsset: (val: Asset3DRecord | null) => void;
  activeTab: 'uploads' | 'links' | 'base64' | 'assets3d';
  setActiveTab: (val: 'uploads' | 'links' | 'base64' | 'assets3d') => void;
  selectedFiles: ImageFileSelection[];
}
const UIStateContext = createContext<FileManagerUIState | null>(null);
export const useFileManagerUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) throw new Error('useFileManagerUIState must be used within FileManagerProvider');
  return context;
};

export interface FileManagerData {
  files: ExpandedImageFile[];
  assets3d: Asset3DRecord[];
  folderOptions: string[];
  tagOptions: string[];
  filteredFiles: ExpandedImageFile[];
  folderFilter: string;
  isPending: boolean;
}
const DataContext = createContext<FileManagerData | null>(null);
export const useFileManagerData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useFileManagerData must be used within FileManagerProvider');
  return context;
};

export interface FileManagerActions {
  handleToggleSelect: (file: ImageFileSelection) => void;
  handleConfirmSelection: () => void;
  handleSelectAll: () => void;
  handleClearSelection: () => void;
  handleDeleteSelected: () => Promise<void>;
  handleApplyTags: () => Promise<void>;
  handleDelete: (fileId: string) => Promise<void>;
  ConfirmationModal: React.ComponentType;
}
const ActionsContext = createContext<FileManagerActions | null>(null);
export const useFileManagerActions = () => {
  const context = useContext(ActionsContext);
  if (!context) throw new Error('useFileManagerActions must be used within FileManagerProvider');
  return context;
};

const normalizeTag = (tag: string): string => tag.trim().toLowerCase();
const parseTagInput = (input: string): string[] => {
  const raw = input.split(',').map(normalizeTag).filter(Boolean);
  return Array.from(new Set(raw));
};

export function FileManagerProvider({
  children,
  onSelectFile,
  mode = 'select',
  selectionMode = 'multiple',
  autoConfirmSelection = false,
  showFolderFilter = false,
  defaultFolder,
  showBulkActions = false,
  showTagSearch = false,
}: {
  children: ReactNode;
  onSelectFile?: (files: ImageFileSelection[]) => void;
  mode?: 'view' | 'select';
  selectionMode?: 'single' | 'multiple';
  autoConfirmSelection?: boolean;
  showFolderFilter?: boolean;
  defaultFolder?: string;
  showBulkActions?: boolean;
  showTagSearch?: boolean;
}): React.JSX.Element {
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

  const assetFilters = useMemo<Asset3DListFilters>(() => {
    const filters: Asset3DListFilters = { search: filenameSearch || null };
    if (enableTagSearch && tagSearchList.length > 0) {
      filters.tags = tagSearchList;
    }
    return filters;
  }, [enableTagSearch, filenameSearch, tagSearchList]);

  const { data: assets3d = [] } = useAssets3D(assetFilters);

  const getFileKind = useCallback((filepath: string) => {
    const clean = (filepath || '').trim();
    if (!clean) return 'other';
    if (clean.startsWith('data:')) return 'base64';
    if (/^https?:\/\//i.test(clean)) {
      try {
        const url = new URL(clean);
        if (url.pathname.includes('/uploads/')) return 'upload';
      } catch {
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
        } catch {
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
      files.filter((file: ExpandedImageFile) => {
        const kind = getFileKind(file.filepath);
        return kind === 'upload' || kind === 'other';
      }),
    [files, getFileKind]
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
    files.forEach((file: ExpandedImageFile) => {
      (file.tags ?? []).forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [files]);

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
    const base = files.filter(filterByTab);
    if (activeTab !== 'uploads') return base;
    if (folderFilter === 'all') return base;
    return base.filter((file: ExpandedImageFile) => resolveFolder(file.filepath) === folderFilter);
  }, [files, filterByTab, folderFilter, activeTab, resolveFolder]);

  const fileById = useMemo((): Map<string, ExpandedImageFile> => {
    return new Map(files.map((file: ExpandedImageFile) => [file.id, file]));
  }, [files]);

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
          logClientError(error, {
            context: {
              source: 'FileManager',
              action: 'deleteSelected',
              count: selectedFiles.length,
            },
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
      logClientError(error, {
        context: { source: 'FileManager', action: 'applyTags', count: selectedFiles.length },
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
            logClientError(error, {
              context: { source: 'FileManager', action: 'deleteFile', fileId },
            });
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
