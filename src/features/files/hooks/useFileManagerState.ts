import { useState, useMemo, useCallback } from 'react';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products/drafts';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

export const useFileManagerState = () => {
  const [filenameSearch, setFilenameSearch] = useState('');
  const [productNameSearch, setProductNameSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace'>('add');
  const [localFolderFilter, setLocalFolderFilter] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ExpandedImageFile | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'uploads' | 'links' | 'base64' | 'assets3d'>('uploads');
  const [selectedFiles, setSelectedFiles] = useState<ImageFileSelection[]>([]);

  const parseTagInput = useCallback((input: string): string[] => {
    const raw = input.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    return Array.from(new Set(raw));
  }, []);

  return {
    filenameSearch, setFilenameSearch,
    productNameSearch, setProductNameSearch,
    tagSearch, setTagSearch,
    bulkTagInput, setBulkTagInput,
    bulkTagMode, setBulkTagMode,
    localFolderFilter, setLocalFolderFilter,
    previewFile, setPreviewFile,
    previewAsset, setPreviewAsset,
    activeTab, setActiveTab,
    selectedFiles, setSelectedFiles,
    parseTagInput,
  };
};
