'use client';

import React, { useCallback, useState, useMemo, type ReactNode } from 'react';
import { useFileManagerUIStateLogic } from '@/features/files/hooks/useFileManagerUIStateLogic';
import { useFileManagerActionsLogic } from '@/features/files/hooks/useFileManagerActionsLogic';
import { useFileManagerDataLogic } from '@/features/files/hooks/useFileManagerDataLogic';
import { internalError } from '@/shared/errors/app-error';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products/drafts';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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
  return (
    <FileManagerSearchProvider>
      <FileManagerConfigProvider {...props}>
        <InternalFileManagerProvider {...props}>{props.children}</InternalFileManagerProvider>
      </FileManagerConfigProvider>
    </FileManagerSearchProvider>
  );
}

function FileManagerSearchProvider({ children }: { children: ReactNode }) {
  const [filenameSearch, setFilenameSearch] = useState('');
  const [productNameSearch, setProductNameSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

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

  return <SearchContext.Provider value={searchValue}>{children}</SearchContext.Provider>;
}

function FileManagerConfigProvider(props: {
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
}) {
  const { children, ...config } = props;
  const configValue = useMemo<FileManagerConfig>(
    () => ({
      mode: config.mode ?? 'select',
      selectionMode: config.selectionMode ?? 'multiple',
      autoConfirmSelection: config.autoConfirmSelection ?? false,
      showFolderFilter: config.showFolderFilter ?? false,
      defaultFolder: config.defaultFolder,
      showBulkActions: config.showBulkActions ?? false,
      showTagSearch: config.showTagSearch ?? false,
      onSelectFile: config.onSelectFile,
    }),
    [config]
  );
  return <ConfigContext.Provider value={configValue}>{children}</ConfigContext.Provider>;
}

function InternalFileManagerProvider(props: {
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

  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace'>('add');
  const [localFolderFilter, setLocalFolderFilter] = useState<string | null>(null);
  const uiState = useFileManagerUIStateLogic('uploads');
  const search = useFileManagerSearch();

  const enableTagSearch = showTagSearch || showBulkActions;
  const tagSearchList = useMemo(() => parseTagInput(search.tagSearch), [search.tagSearch]);

  const fileData = useFileManagerDataLogic({
    filenameSearch: search.filenameSearch,
    productNameSearch: search.productNameSearch,
    tagSearchList,
    enableTagSearch,
    filepathFilter,
  });

  const resolveFolder = useCallback(
    (filepath: string): string => {
      const kind = fileData.getFileKind(filepath);
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
    [fileData.getFileKind]
  );

  const uploadFiles = useMemo(
    () =>
      fileData.visibleFiles.filter((file: ExpandedImageFile) => {
        const kind = fileData.getFileKind(file.filepath);
        return kind === 'upload' || kind === 'other';
      }),
    [fileData.visibleFiles, fileData.getFileKind]
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
    fileData.visibleFiles.forEach((file: ExpandedImageFile) => {
      (file.tags ?? []).forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [fileData.visibleFiles]);

  const filterByTab = useMemo(() => {
    if (uiState.activeTab === 'links')
      return (file: ExpandedImageFile) => fileData.getFileKind(file.filepath) === 'link';
    if (uiState.activeTab === 'base64')
      return (file: ExpandedImageFile) => fileData.getFileKind(file.filepath) === 'base64';
    if (uiState.activeTab === 'assets3d')
      return () => false;
    return (file: ExpandedImageFile) => {
      const kind = fileData.getFileKind(file.filepath);
      return kind === 'upload' || kind === 'other';
    };
  }, [uiState.activeTab, fileData.getFileKind]);

  const filteredFiles = useMemo((): ExpandedImageFile[] => {
    const base = fileData.visibleFiles.filter(filterByTab);
    if (uiState.activeTab !== 'uploads') return base;
    if (folderFilter === 'all') return base;
    return base.filter((file: ExpandedImageFile) => resolveFolder(file.filepath) === folderFilter);
  }, [fileData.visibleFiles, filterByTab, folderFilter, uiState.activeTab, resolveFolder]);

  const fileById = useMemo((): Map<string, ExpandedImageFile> => {
    return new Map(fileData.visibleFiles.map((file: ExpandedImageFile) => [file.id, file]));
  }, [fileData.visibleFiles]);

  const actions = useFileManagerActionsLogic(
    uiState.selectedFiles,
    uiState.setSelectedFiles,
    bulkTagInput,
    setBulkTagInput,
    bulkTagMode,
    fileById,
    parseTagInput
  );

  const handleToggleSelect = useCallback(
    (file: ImageFileSelection): void => {
      uiState.setSelectedFiles((prev) => {
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
    [selectionMode, autoConfirmSelection, onSelectFile, uiState.setSelectedFiles]
  );

  const handleConfirmSelection = useCallback((): void => {
    if (onSelectFile) onSelectFile(uiState.selectedFiles);
  }, [onSelectFile, uiState.selectedFiles]);

  const handleSelectAll = useCallback((): void => {
    const toSelect = filteredFiles.map((file) => ({ id: file.id, filepath: file.filepath }));
    uiState.setSelectedFiles(toSelect);
  }, [filteredFiles, uiState.setSelectedFiles]);

  const handleClearSelection = useCallback((): void => {
    uiState.setSelectedFiles([]);
  }, [uiState.setSelectedFiles]);

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
      filenameSearch: search.filenameSearch,
      setFilenameSearch: search.setFilenameSearch,
      productNameSearch: search.productNameSearch,
      setProductNameSearch: search.setProductNameSearch,
      tagSearch: search.tagSearch,
      setTagSearch: search.setTagSearch,
    }),
    [search]
  );

  const uiStateValue = useMemo<FileManagerUIState>(
    () => ({
      bulkTagInput,
      setBulkTagInput,
      bulkTagMode,
      setBulkTagMode,
      localFolderFilter,
      setLocalFolderFilter,
      previewFile: uiState.previewFile,
      setPreviewFile: uiState.setPreviewFile,
      previewAsset: uiState.previewAsset,
      setPreviewAsset: uiState.setPreviewAsset,
      activeTab: uiState.activeTab,
      setActiveTab: uiState.setActiveTab,
      selectedFiles: uiState.selectedFiles,
    }),
    [
      bulkTagInput,
      setBulkTagInput,
      bulkTagMode,
      setBulkTagMode,
      localFolderFilter,
      setLocalFolderFilter,
      uiState
    ]
  );

  const dataValue = useMemo<FileManagerData>(
    () => ({
      files: fileData.files,
      assets3d: fileData.assets3d,
      folderOptions,
      tagOptions,
      filteredFiles,
      folderFilter,
      isPending: actions.isPending,
    }),
    [
      fileData.files,
      fileData.assets3d,
      folderOptions,
      tagOptions,
      filteredFiles,
      folderFilter,
      actions.isPending
    ]
  );

  const actionsValue = useMemo<FileManagerActions>(
    () => ({
      handleToggleSelect,
      handleConfirmSelection,
      handleSelectAll,
      handleClearSelection,
      handleDeleteSelected: actions.deleteSelected,
      handleApplyTags: actions.applyTags,
      handleDelete: actions.deleteFile,
      ConfirmationModal: actions.ConfirmationModal,
    }),
    [
      actions,
      handleToggleSelect,
      handleConfirmSelection,
      handleSelectAll,
      handleClearSelection
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
