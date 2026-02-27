import { useState, useEffect, useCallback } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { Asset3DRecord, Asset3DUpdateInput } from '@/shared/contracts/viewer3d';

import { updateAsset3D } from '../api';


export function useAsset3DForm(
  asset: Asset3DRecord,
  onSave: (updated: Asset3DRecord) => void,
  onClose: () => void,
) {
  const [name, setName] = useState(asset.name ?? '');
  const [description, setDescription] = useState(asset.description ?? '');
  const [category, setCategory] = useState(asset.categoryId ?? '');
  const [tags, setTags] = useState<string[]>(asset.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isPublic, setIsPublic] = useState(asset.isPublic ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(asset.name ?? '');
    setDescription(asset.description ?? '');
    setCategory(asset.categoryId ?? '');
    setTags(asset.tags || []);
    setIsPublic(asset.isPublic ?? false);
    setError(null);
  }, [asset]);

  const handleAddTag = useCallback((): void => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tag: string): void => {
    setTags((prevTags) => prevTags.filter((t: string) => t !== tag));
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError(null);

    try {
      const data: Asset3DUpdateInput = {
        name: name.trim() || asset.name,
        description: description.trim() || null,
        categoryId: category.trim() || null,
        tags,
        isPublic,
      };

      const updated = await updateAsset3D(asset.id, data);
      onSave(updated);
      onClose();
    } catch (err) {
      logClientError(err, { context: { source: 'Asset3DEditModal', action: 'saveAsset', assetId: asset.id } });
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [name, description, category, tags, isPublic, asset.id, onSave, onClose]);

  return {
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    tags,
    setTags,
    newTag,
    setNewTag,
    isPublic,
    setIsPublic,
    isSaving,
    error,
    handleAddTag,
    handleRemoveTag,
    handleSave,
  };
}
