'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button, Input, Alert, Tag, MetadataItem } from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';
import { formatFileSize } from '@/shared/utils';

import { useAdmin3DAssetsContext } from '../context/Admin3DAssetsContext';
import { useAsset3DForm } from '../hooks/useAsset3DForm';

interface Asset3DEditModalProps extends EntityModalProps<Asset3DRecord> {}

type AssetFormState = {
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
};

export function Asset3DEditModal(props: Asset3DEditModalProps): React.JSX.Element | null {
  const { isOpen, onClose, item: asset } = props;

  if (!asset) return null;

  const {
    handleEdit: onSave,
    categories: existingCategories = [],
    allTags: existingTags = [],
  } = useAdmin3DAssetsContext();

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

  const formValues: AssetFormState = {
    name,
    description,
    category,
    isPublic: isPublic ?? false,
  };

  const handleChange = (vals: Partial<AssetFormState>) => {
    if (vals.name !== undefined) setName(vals.name);
    if (vals.description !== undefined) setDescription(vals.description);
    if (vals.category !== undefined) setCategory(vals.category);
    if (vals.isPublic !== undefined) setIsPublic(vals.isPublic);
  };

  const fields: SettingsField<AssetFormState>[] = [
    {
      key: 'name',
      label: 'File Details',
      type: 'custom',
      render: () => (
        <div className='grid grid-cols-2 gap-3'>
          <MetadataItem
            label='Filename'
            value={asset.filename}
            mono
            variant='card'
            className='p-3'
          />
          <MetadataItem
            label='File Size'
            value={formatFileSize(asset.size || 0)}
            variant='card'
            className='p-3'
          />{' '}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Enter asset name...',
      required: true,
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter description...',
    },
    {
      key: 'category',
      label: 'Category',
      type: 'custom',
      render: () => (
        <div className='flex gap-2'>
          <Input
            id='category'
            value={category}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCategory(e.target.value)}
            placeholder='Enter category...'
            list='categories-list'
            className='flex-1 h-9'
           aria-label='Enter category...' title='Enter category...'/>
          <datalist id='categories-list'>
            {existingCategories.map((cat: string) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>
      ),
    },
    {
      key: 'name', // Custom field for Tags
      label: 'Tags',
      type: 'custom',
      render: () => (
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
              className='flex-1 h-9'
             aria-label='Add tag...' title='Add tag...'/>
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
              aria-label='Add tag'
              onClick={handleAddTag}
              className='h-9 w-9'
              title={'Add tag'}>
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
      ),
    },
    {
      key: 'isPublic',
      label: 'Public visibility',
      type: 'checkbox',
      helperText: 'Make this asset accessible publicly',
    },
  ];

  return (
    <>
      <SettingsPanelBuilder
        open={isOpen}
        onClose={onClose}
        title='Edit 3D Asset'
        fields={fields}
        values={formValues}
        onChange={handleChange}
        onSave={async () => handleSave()}
        isSaving={isSaving}
        size='md'
      />
      {error && (
        <div className='fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4'>
          <Alert variant='error' className='shadow-2xl'>
            {error}
          </Alert>
        </div>
      )}
    </>
  );
}
