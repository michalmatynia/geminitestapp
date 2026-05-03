'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button, Input, Alert } from '@/shared/ui/primitives.public';
import { Tag } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';
import { formatFileSize } from '@/shared/utils/formatting';

import { useAdmin3DAssetsContext } from '../context/Admin3DAssetsContext';
import { useAsset3DForm } from '../hooks/useAsset3DForm';

interface Asset3DEditModalProps extends EntityModalProps<Asset3DRecord> {}

type AssetFormState = {
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
};

type AssetMetadataFieldProps = {
  asset: Asset3DRecord;
};

function AssetMetadataField({ asset }: AssetMetadataFieldProps): React.JSX.Element {
  return (
    <div className='grid grid-cols-2 gap-3'>
      <MetadataItem label='Filename' value={asset.filename} mono variant='card' className='p-3' />
      <MetadataItem
        label='File Size'
        value={formatFileSize(asset.size ?? 0)}
        variant='card'
        className='p-3'
      />
    </div>
  );
}

type AssetCategoryFieldProps = {
  category: string;
  setCategory: (value: string) => void;
  existingCategories: string[];
};

function AssetCategoryField({
  category,
  setCategory,
  existingCategories,
}: AssetCategoryFieldProps): React.JSX.Element {
  return (
    <div className='flex gap-2'>
      <Input
        id='category'
        value={category}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCategory(e.target.value)}
        placeholder='Enter category...'
        list='categories-list'
        className='flex-1 h-9'
        aria-label='Enter category...'
        title='Enter category...'
      />
      <datalist id='categories-list'>
        {existingCategories.map((cat: string) => (
          <option key={cat} value={cat} aria-label={cat} />
        ))}
      </datalist>
    </div>
  );
}

type AssetTagsFieldProps = {
  newTag: string;
  setNewTag: (value: string) => void;
  tags: string[];
  existingTags: string[];
  handleAddTag: () => void;
  handleRemoveTag: (tag: string) => void;
};

function AssetTagsField({
  newTag,
  setNewTag,
  tags,
  existingTags,
  handleAddTag,
  handleRemoveTag,
}: AssetTagsFieldProps): React.JSX.Element {
  const availableTags = existingTags.filter((tag: string) => !tags.includes(tag));

  return (
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
          aria-label='Add tag...'
          title='Add tag...'
        />
        <datalist id='tags-list'>
          {availableTags.map((tag: string) => (
            <option key={tag} value={tag} aria-label={tag} />
          ))}
        </datalist>
        <Button
          type='button'
          variant='secondary'
          size='icon'
          aria-label='Add tag'
          onClick={handleAddTag}
          className='h-9 w-9'
          title='Add tag'
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>
      {tags.length > 0 ? (
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
      ) : null}
    </div>
  );
}

type AssetEditFieldsInput = AssetCategoryFieldProps &
  AssetTagsFieldProps & {
    asset: Asset3DRecord;
  };

const createAssetMetadataField = (
  asset: Asset3DRecord
): SettingsPanelField<AssetFormState> => ({
  key: 'name',
  label: 'File Details',
  type: 'custom',
  render: () => <AssetMetadataField asset={asset} />,
});

const ASSET_NAME_FIELD: SettingsPanelField<AssetFormState> = {
  key: 'name',
  label: 'Name',
  type: 'text',
  placeholder: 'Enter asset name...',
  required: true,
};

const ASSET_DESCRIPTION_FIELD: SettingsPanelField<AssetFormState> = {
  key: 'description',
  label: 'Description',
  type: 'textarea',
  placeholder: 'Enter description...',
};

const createAssetCategoryField = (
  props: AssetCategoryFieldProps
): SettingsPanelField<AssetFormState> => ({
  key: 'category',
  label: 'Category',
  type: 'custom',
  render: () => <AssetCategoryField {...props} />,
});

const createAssetTagsField = (
  props: AssetTagsFieldProps
): SettingsPanelField<AssetFormState> => ({
  key: 'name',
  label: 'Tags',
  type: 'custom',
  render: () => <AssetTagsField {...props} />,
});

const ASSET_PUBLIC_FIELD: SettingsPanelField<AssetFormState> = {
  key: 'isPublic',
  label: 'Public visibility',
  type: 'checkbox',
  helperText: 'Make this asset accessible publicly',
};

const createAssetEditFields = ({
  asset,
  category,
  setCategory,
  existingCategories,
  newTag,
  setNewTag,
  tags,
  existingTags,
  handleAddTag,
  handleRemoveTag,
}: AssetEditFieldsInput): SettingsPanelField<AssetFormState>[] => [
  createAssetMetadataField(asset),
  ASSET_NAME_FIELD,
  ASSET_DESCRIPTION_FIELD,
  createAssetCategoryField({ category, setCategory, existingCategories }),
  createAssetTagsField({ newTag, setNewTag, tags, existingTags, handleAddTag, handleRemoveTag }),
  ASSET_PUBLIC_FIELD,
];

export function Asset3DEditModal(props: Asset3DEditModalProps): React.JSX.Element | null {
  const { isOpen, onClose, item: asset } = props;

  if (!asset) return null;

  const {
    handleEdit: onSave,
    categories: existingCategories = [],
    allTags: existingTags = [],
  } = useAdmin3DAssetsContext();

  const form = useAsset3DForm(asset, onSave, onClose);

  const formValues: AssetFormState = {
    name: form.name,
    description: form.description,
    category: form.category,
    isPublic: form.isPublic,
  };

  const handleChange = (vals: Partial<AssetFormState>): void => {
    if (vals.name !== undefined) form.setName(vals.name);
    if (vals.description !== undefined) form.setDescription(vals.description);
    if (vals.category !== undefined) form.setCategory(vals.category);
    if (vals.isPublic !== undefined) form.setIsPublic(vals.isPublic);
  };

  const fields = createAssetEditFields({
    asset,
    category: form.category,
    setCategory: form.setCategory,
    existingCategories,
    newTag: form.newTag,
    setNewTag: form.setNewTag,
    tags: form.tags,
    existingTags,
    handleAddTag: form.handleAddTag,
    handleRemoveTag: form.handleRemoveTag,
  });
  const errorMessage =
    typeof form.error === 'string' && form.error.trim().length > 0 ? form.error : null;

  return (
    <>
      <SettingsPanelBuilder
        open={isOpen}
        onClose={onClose}
        title='Edit 3D Asset'
        fields={fields}
        values={formValues}
        onChange={handleChange}
        onSave={form.handleSave}
        isSaving={form.isSaving}
        size='md'
      />
      {errorMessage !== null ? (
        <div className='fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4'>
          <Alert variant='error' className='shadow-2xl'>
            {errorMessage}
          </Alert>
        </div>
      ) : null}
    </>
  );
}
