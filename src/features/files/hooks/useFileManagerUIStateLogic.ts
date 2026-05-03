
import { useState, useCallback } from 'react';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products/drafts';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
export interface FileManagerUIStateLogic {
  previewFile: ExpandedImageFile | null;
  setPreviewFile: React.Dispatch<React.SetStateAction<ExpandedImageFile | null>>;
  previewAsset: Asset3DRecord | null;
  setPreviewAsset: React.Dispatch<React.SetStateAction<Asset3DRecord | null>>;
  activeTab: 'uploads' | 'links' | 'base64' | 'assets3d';
  setActiveTab: React.Dispatch<React.SetStateAction<'uploads' | 'links' | 'base64' | 'assets3d'>>;
  selectedFiles: ImageFileSelection[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<ImageFileSelection[]>>;
  toggleFileSelection: (file: ImageFileSelection) => void;
}

export function useFileManagerUIStateLogic(initialTab: 'uploads' | 'links' | 'base64' | 'assets3d' = 'uploads'): FileManagerUIStateLogic {
  // ...

  const [previewFile, setPreviewFile] = useState<ExpandedImageFile | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedFiles, setSelectedFiles] = useState<ImageFileSelection[]>([]);

  const toggleFileSelection = useCallback((file: ImageFileSelection) => {
    setSelectedFiles((prev) => {
      const exists = prev.find((f) => f.id === file.id);
      return exists ? prev.filter((f) => f.id !== file.id) : [...prev, file];
    });
  }, []);

  return {
    previewFile,
    setPreviewFile,
    previewAsset,
    setPreviewAsset,
    activeTab,
    setActiveTab,
    selectedFiles,
    setSelectedFiles,
    toggleFileSelection,
  };
}
