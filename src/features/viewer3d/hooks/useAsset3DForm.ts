/**
 * 3D Asset Form Management Hook
 * 
 * Manages form state and operations for editing 3D asset metadata.
 * Provides:
 * - Form field state management (name, description, category, tags, visibility)
 * - Tag addition and removal functionality
 * - Async save operations with error handling
 * - Form validation and data normalization
 * - Loading states and error feedback
 * - Asset data synchronization on prop changes
 */

'use client';

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';

import type { Asset3DRecord, Asset3DUpdateInput } from '@/shared/contracts/viewer3d';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { updateAsset3D } from '../api';

interface UseAsset3DFormReturn {
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  tags: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
  newTag: string;
  setNewTag: Dispatch<SetStateAction<string>>;
  isPublic: boolean;
  setIsPublic: Dispatch<SetStateAction<boolean>>;
  isSaving: boolean;
  error: string | null;
  handleAddTag: () => void;
  handleRemoveTag: (tag: string) => void;
  handleSave: () => Promise<void>;
}

const getAssetTags = (asset: Asset3DRecord): string[] => asset.tags ?? [];

function buildAssetUpdateInput(
  asset: Asset3DRecord,
  form: { name: string; description: string; category: string; tags: string[]; isPublic: boolean }
): Asset3DUpdateInput {
  const trimmedName = form.name.trim();
  const trimmedDescription = form.description.trim();
  const trimmedCategory = form.category.trim();

  return {
    name: trimmedName !== '' ? trimmedName : asset.name,
    description: trimmedDescription !== '' ? trimmedDescription : null,
    categoryId: trimmedCategory !== '' ? trimmedCategory : null,
    tags: form.tags,
    isPublic: form.isPublic,
  };
}

/**
 * Hook for managing 3D asset edit form state and operations
 * @param asset - The asset record being edited
 * @param onSave - Callback fired when asset is successfully saved
 * @param onClose - Callback to close the form/modal
 * @returns Form state, handlers, and status flags
 */
export function useAsset3DForm(
  asset: Asset3DRecord,
  onSave: (updated: Asset3DRecord) => void,
  onClose: () => void
): UseAsset3DFormReturn {
  /** Form field states initialized from asset data */
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description ?? '');
  const [category, setCategory] = useState(asset.categoryId ?? '');
  const [tags, setTags] = useState<string[]>(getAssetTags(asset));
  const [newTag, setNewTag] = useState('');
  const [isPublic, setIsPublic] = useState(asset.isPublic ?? false);
  
  /** Operation states for UI feedback */
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sync form state when asset prop changes */
  useEffect(() => {
    setName(asset.name);
    setDescription(asset.description ?? '');
    setCategory(asset.categoryId ?? '');
    setTags(getAssetTags(asset));
    setIsPublic(asset.isPublic ?? false);
    setError(null);
  }, [asset]);

  /** Add new tag to the list if valid and unique */
  const handleAddTag = useCallback((): void => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed !== '' && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  }, [newTag, tags]);

  /** Remove tag from the list */
  const handleRemoveTag = useCallback((tag: string): void => {
    setTags((prevTags) => prevTags.filter((t: string) => t !== tag));
  }, []);

  /** Save asset changes with error handling and loading states */
  const handleSave = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError(null);

    try {
      const data = buildAssetUpdateInput(asset, { name, description, category, tags, isPublic });
      const updated = await updateAsset3D(asset.id, data);
      onSave(updated);
      onClose();
    } catch (err) {
      /** Log error for observability and show user feedback */
      logClientCatch(err, { source: 'Asset3DEditModal', action: 'saveAsset', assetId: asset.id });
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [name, description, category, tags, isPublic, asset.id, onSave, onClose]);

  return { name, setName, description, setDescription, category, setCategory, tags, setTags, newTag, setNewTag, isPublic, setIsPublic, isSaving, error, handleAddTag, handleRemoveTag, handleSave };
}
