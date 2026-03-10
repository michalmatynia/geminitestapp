
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

import type { ComponentType } from 'react';

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

export interface FileManagerSearch {
  filenameSearch: string;
  setFilenameSearch: (val: string) => void;
  productNameSearch: string;
  setProductNameSearch: (val: string) => void;
  tagSearch: string;
  setTagSearch: (val: string) => void;
}

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

export interface FileManagerData {
  files: ExpandedImageFile[];
  assets3d: Asset3DRecord[];
  folderOptions: string[];
  tagOptions: string[];
  filteredFiles: ExpandedImageFile[];
  folderFilter: string;
  isPending: boolean;
}

export interface FileManagerActions {
  handleToggleSelect: (file: ImageFileSelection) => void;
  handleConfirmSelection: () => void;
  handleSelectAll: () => void;
  handleClearSelection: () => void;
  handleDeleteSelected: () => Promise<void>;
  handleApplyTags: () => Promise<void>;
  handleDelete: (fileId: string) => Promise<void>;
  ConfirmationModal: ComponentType;
}
