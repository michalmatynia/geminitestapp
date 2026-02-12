'use client';

import { X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

import { logClientError } from '@/features/observability';
import {
  Button,
  Input,
  Label,
  AppModal,
  Alert,
  SectionPanel,
  Checkbox,
} from '@/shared/ui';

import { updateAsset3D } from '../api';

import type { Asset3DRecord, Asset3DUpdateInput } from '../types';


interface Asset3DEditModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset3DRecord;
  onSave: (updated: Asset3DRecord) => void;
  existingCategories?: string[];
  existingTags?: string[];
}

export function Asset3DEditModal({
  open,
  onClose,
  asset,
  onSave,
  existingCategories = [],
  existingTags = [],
}: Asset3DEditModalProps): React.JSX.Element {
  const [name, setName] = useState(asset.name ?? '');
  const [description, setDescription] = useState(asset.description ?? '');
  const [category, setCategory] = useState(asset.category ?? '');
  const [tags, setTags] = useState<string[]>(asset.tags);
  const [newTag, setNewTag] = useState('');
  const [isPublic, setIsPublic] = useState(asset.isPublic);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(asset.name ?? '');
    setDescription(asset.description ?? '');
    setCategory(asset.category ?? '');
    setTags(asset.tags);
    setIsPublic(asset.isPublic);
    setError(null);
  }, [asset]);

  const handleAddTag = (): void => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string): void => {
    setTags(tags.filter((t: string) => t !== tag));
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    setError(null);

    try {
      const data: Asset3DUpdateInput = {
        name: name.trim() || null,
        description: description.trim() || null,
        category: category.trim() || null,
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
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title='Edit 3D Asset'
      footer={
        <div className='flex items-center justify-end gap-2'>
          <Button variant='ghost' onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={() => { void handleSave(); }}
            loading={isSaving}
            loadingText='Saving...'
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className='space-y-4 max-h-[60vh] overflow-y-auto pr-1'>
        {/* File Info (read-only) */}
        <SectionPanel variant='subtle-compact' className='p-3 text-sm'>
          <p className='text-gray-400'>
            <span className='text-gray-500'>File:</span>{' '}
            <span className='text-white'>{asset.filename}</span>
          </p>
          <p className='text-gray-400 mt-1'>
            <span className='text-gray-500'>Size:</span>{' '}
            {formatFileSize(asset.size)}
          </p>
        </SectionPanel>

        {/* Name */}
        <div className='space-y-1'>
          <Label htmlFor='name' className='text-sm text-gray-300'>
            Name
          </Label>
          <Input
            id='name'
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
            placeholder='Enter asset name...'
            className='bg-gray-800 border-gray-700'
          />
        </div>

        {/* Description */}
        <div className='space-y-1'>
          <Label htmlFor='description' className='text-sm text-gray-300'>
            Description
          </Label>
          <textarea
            id='description'
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescription(e.target.value)}
            placeholder='Enter description...'
            rows={3}
            className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm'
          />
        </div>

        {/* Category */}
        <div className='space-y-1'>
          <Label htmlFor='category' className='text-sm text-gray-300'>
            Category
          </Label>
          <div className='flex gap-2'>
            <Input
              id='category'
              value={category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCategory(e.target.value)}
              placeholder='Enter category...'
              list='categories-list'
              className='bg-gray-800 border-gray-700 flex-1'
            />
            <datalist id='categories-list'>
              {existingCategories.map((cat: string) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Tags */}
        <div className='space-y-1'>
          <Label className='text-sm text-gray-300'>Tags</Label>
          <div className='flex gap-2'>
            <Input
              value={newTag}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNewTag(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder='Add tag...'
              list='tags-list'
              className='bg-gray-800 border-gray-700 flex-1'
            />
            <datalist id='tags-list'>
              {existingTags
                .filter((t: string) => !tags.includes(t))
                .map((tag: string) => (
                  <option key={tag} value={tag} />
                ))}
            </datalist>
            <Button
              type='button'
              variant='secondary'
              size='icon'
              onClick={handleAddTag}
            >
              <Plus className='h-4 w-4' />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className='flex flex-wrap gap-1 mt-2'>
              {tags.map((tag: string) => (
                <span
                  key={tag}
                  className='inline-flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs'
                >
                  {tag}
                  <button
                    type='button'
                    onClick={() => handleRemoveTag(tag)}
                    className='text-gray-500 hover:text-red-400'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Visibility */}
        <label className='flex items-center gap-3 cursor-pointer'>
          <Checkbox
            checked={isPublic}
            onCheckedChange={(v: boolean | 'indeterminate'): void => setIsPublic(v === true)}
          />
          <div>
            <span className='text-sm text-white font-medium'>Public visibility</span>
            <p className='text-[11px] text-gray-500'>
              Make this asset accessible publicly
            </p>
          </div>
        </label>

        {/* Error */}
        {error && (
          <Alert variant='error'>
            {error}
          </Alert>
        )}
      </div>
    </AppModal>
  );
}
