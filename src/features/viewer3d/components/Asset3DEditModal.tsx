'use client';

import { Plus } from 'lucide-react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import {
  Button,
  Input,
  FormModal,
  Alert,
  FormSection,
  Checkbox,
  Textarea,
  Tag,
  FormField,
} from '@/shared/ui';

import { useAsset3DForm } from '../hooks/useAsset3DForm';

import type { Asset3DRecord } from '../types';

interface Asset3DEditModalProps extends Omit<EntityModalProps<Asset3DRecord>, 'onSuccess'> {
  onSuccess?: () => void;
  onSave: (updated: Asset3DRecord) => void;
  existingCategories?: string[];
  existingTags?: string[];
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export function Asset3DEditModal({
  isOpen,
  onClose,
  item: asset,
  onSave,
  existingCategories = [],
  existingTags = [],
}: Asset3DEditModalProps): React.JSX.Element | null {
  if (!asset) return null;

  const {
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    tags,
    newTag,
    setNewTag,
    isPublic,
    setIsPublic,
    isSaving,
    error,
    handleAddTag,
    handleRemoveTag,
    handleSave,
  } = useAsset3DForm(asset, onSave, onClose);

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Edit 3D Asset'
      onSave={(): void => { void handleSave(); }}
      isSaving={isSaving}
      size='md'
    >
      <div className='space-y-4 max-h-[60vh] overflow-y-auto pr-1'>
        <FormSection variant='subtle-compact' className='p-3 text-sm'>
          <p className='text-gray-400'>
            <span className='text-gray-500'>File:</span> <span className='text-white font-mono text-xs'>{asset.filename}</span>
          </p>
          <p className='text-gray-400 mt-1'>
            <span className='text-gray-500'>Size:</span> {formatFileSize(asset.size)}
          </p>
        </FormSection>

        <FormField label='Name'>
          <Input
            id='name'
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
            placeholder='Enter asset name...'
            className='bg-gray-800 border-gray-700 h-9'
          />
        </FormField>

        <FormField label='Description'>
          <Textarea
            id='description'
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescription(e.target.value)}
            placeholder='Enter description...'
            className='bg-gray-800 border-gray-700 min-h-[80px] text-sm'
          />
        </FormField>

        <FormField label='Category'>
          <div className='flex gap-2'>
            <Input
              id='category'
              value={category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCategory(e.target.value)}
              placeholder='Enter category...'
              list='categories-list'
              className='bg-gray-800 border-gray-700 flex-1 h-9'
            />
            <datalist id='categories-list'>
              {existingCategories.map((cat: string) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </FormField>

        <FormField label='Tags'>
          <div className='space-y-2 mt-1'>
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
                className='bg-gray-800 border-gray-700 flex-1 h-9'
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
                className='h-9 w-9'
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className='flex flex-wrap gap-1 mt-2'>
                {tags.map((tag: string) => (
                  <Tag
                    key={tag}
                    label={tag}
                    onRemove={() => handleRemoveTag(tag)}
                    className='bg-gray-700 text-gray-300 border-none'
                  />
                ))}
              </div>
            )}
          </div>
        </FormField>

        <div className='flex items-center gap-3 p-3 rounded-md border border-border/40 bg-gray-900/40'>
          <Checkbox
            id='is-public'
            checked={isPublic}
            onCheckedChange={(v: boolean | 'indeterminate'): void => setIsPublic(v === true)}
          />
          <label htmlFor='is-public' className='cursor-pointer flex-1'>
            <span className='text-sm text-white font-medium'>Public visibility</span>
            <p className='text-[11px] text-gray-500'>Make this asset accessible publicly</p>
          </label>
        </div>

        {error && (
          <Alert variant='error' className='mt-2'>
            {error}
          </Alert>
        )}
      </div>
    </FormModal>
  );
}
