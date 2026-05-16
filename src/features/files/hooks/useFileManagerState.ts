/**
 * File Manager State Hook
 * 
 * Manages the complete state for the file management interface.
 * Handles:
 * - Search and filtering across multiple criteria
 * - File selection and bulk operations
 * - Preview modal state for images and 3D assets
 * - Tab navigation between different file types
 * - Tag management and bulk tagging operations
 * 
 * This hook centralizes all file manager UI state, providing
 * a consistent interface for file browsing, organization,
 * and manipulation across the application.
 */

import { useState, useCallback } from 'react';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products/drafts';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

export const useFileManagerState = () => {
  // Search and filtering state
  const [filenameSearch, setFilenameSearch] = useState('');
  const [productNameSearch, setProductNameSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace'>('add');
  const [localFolderFilter, setLocalFolderFilter] = useState<string | null>(null);
  
  // Preview and modal state
  const [previewFile, setPreviewFile] = useState<ExpandedImageFile | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  
  // Navigation and selection state
  const [activeTab, setActiveTab] = useState<'uploads' | 'links' | 'base64' | 'assets3d'>('uploads');
  const [selectedFiles, setSelectedFiles] = useState<ImageFileSelection[]>([]);

  // Utility function to parse comma-separated tags
  const parseTagInput = useCallback((input: string): string[] => {
    const raw = input.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    return Array.from(new Set(raw)); // Remove duplicates
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
