
import { useMemo } from 'react';
import type {
  FileManagerActions,
  FileManagerConfig,
  FileManagerData,
  FileManagerSearch,
  FileManagerUIState,
} from './FileManagerContext.types';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products/drafts';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

export function useFileManagerProviderValues(
  props: {
    mode: 'view' | 'select';
    selectionMode: 'single' | 'multiple';
    autoConfirmSelection: boolean;
    showFolderFilter: boolean;
    defaultFolder: string | undefined;
    showBulkActions: boolean;
    showTagSearch: boolean;
    onSelectFile: ((files: ImageFileSelection[]) => void) | undefined;
  },
  searchState: {
    filenameSearch: string;
    productNameSearch: string;
    tagSearch: string;
  },
  setSearchState: {
    setFilenameSearch: (v: string) => void;
    setProductNameSearch: (v: string) => void;
    setTagSearch: (v: string) => void;
  },
  uiState: any, // Placeholder for uiState return
  actions: any, // Placeholder for actions return
  data: {
    files: ExpandedImageFile[];
    assets3d: Asset3DRecord[];
    folderOptions: string[];
    tagOptions: string[];
    filteredFiles: ExpandedImageFile[];
    folderFilter: string;
    isPending: boolean;
  }
) {
  const configValue = useMemo<FileManagerConfig>(() => ({
    mode: props.mode,
    selectionMode: props.selectionMode,
    autoConfirmSelection: props.autoConfirmSelection,
    showFolderFilter: props.showFolderFilter,
    defaultFolder: props.defaultFolder,
    showBulkActions: props.showBulkActions,
    showTagSearch: props.showTagSearch,
    onSelectFile: props.onSelectFile,
  }), [props]);

  const searchValue = useMemo<FileManagerSearch>(() => ({
    ...searchState,
    ...setSearchState,
  }), [searchState, setSearchState]);

  const uiStateValue = useMemo<FileManagerUIState>(() => ({
    bulkTagInput: uiState.bulkTagInput,
    setBulkTagInput: uiState.setBulkTagInput,
    bulkTagMode: uiState.bulkTagMode,
    setBulkTagMode: uiState.setBulkTagMode,
    localFolderFilter: uiState.localFolderFilter,
    setLocalFolderFilter: uiState.setLocalFolderFilter,
    previewFile: uiState.previewFile,
    setPreviewFile: uiState.setPreviewFile,
    previewAsset: uiState.previewAsset,
    setPreviewAsset: uiState.setPreviewAsset,
    activeTab: uiState.activeTab,
    setActiveTab: uiState.setActiveTab,
    selectedFiles: uiState.selectedFiles,
  }), [uiState]);

  const dataValue = useMemo<FileManagerData>(() => ({
    files: data.files,
    assets3d: data.assets3d,
    folderOptions: data.folderOptions,
    tagOptions: data.tagOptions,
    filteredFiles: data.filteredFiles,
    folderFilter: data.folderFilter,
    isPending: data.isPending,
  }), [data]);

  const actionsValue = useMemo<FileManagerActions>(() => ({
    handleToggleSelect: actions.toggleFileSelection,
    handleConfirmSelection: props.onSelectFile ? () => props.onSelectFile?.(uiState.selectedFiles) : () => undefined,
    handleSelectAll: () => undefined,
    handleClearSelection: () => uiState.setSelectedFiles([]),
    handleDeleteSelected: actions.deleteSelected,
    handleApplyTags: actions.applyTags,
    handleDelete: actions.deleteFile,
    ConfirmationModal: actions.ConfirmationModal,
  }), [actions, uiState.selectedFiles, uiState.setSelectedFiles, props.onSelectFile]);

  return { configValue, searchValue, uiStateValue, dataValue, actionsValue };
}
