'use client';

import React from 'react';

import {
  Button,
  Input,
  Textarea,
  Label,
  AppModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';

import { useCategoryFormContext } from './CategoryFormContext';

export function CategoryForm(): React.JSX.Element | null {
  const {
    open,
    onClose,
    isEditing,
    formData,
    onFormDataChange,
    onSave,
    saving,
    catalogs,
    onCatalogChange,
    parentOptions,
    loadingCategories,
    modalCatalogName,
  } = useCategoryFormContext();
  if (!open) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Category' : 'Create Category'}
      size='md'
    >
      <div className='space-y-4'>
        <div>
          <Label className='text-xs text-gray-400'>Name</Label>
          <Input
            className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onFormDataChange((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder='Category name'
          />
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Description</Label>
          <Textarea
            className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
            rows={3}
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
              onFormDataChange((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder='Optional description'
          />
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Catalog</Label>
          <div className='mt-2'>
            <Select
              value={formData.catalogId}
              onValueChange={(value: string): void => {
                onFormDataChange((prev) => ({
                  ...prev,
                  catalogId: value,
                  parentId: prev.catalogId !== value ? null : prev.parentId,
                }));
                onCatalogChange(value);
              }}
            >
              <SelectTrigger className='w-full bg-gray-900 border-border text-sm text-white'>
                <SelectValue placeholder='Select catalog' />
              </SelectTrigger>
              <SelectContent>
                {catalogs.map((catalog): React.JSX.Element => (
                  <SelectItem key={catalog.id} value={catalog.id}>
                    {catalog.name}
                    {catalog.isDefault ? ' (Default)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Parent Category</Label>
          <div className='mt-2'>
            <Select
              value={formData.parentId ?? '__root__'}
              onValueChange={(value: string): void =>
                onFormDataChange((prev) => ({
                  ...prev,
                  parentId: value === '__root__' ? null : value,
                }))
              }
              disabled={loadingCategories}
            >
              <SelectTrigger className='w-full bg-gray-900 border-border text-sm text-white'>
                <SelectValue placeholder='Select parent category' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__root__'>No parent (root)</SelectItem>
                {parentOptions.map((option): React.JSX.Element => (
                  <SelectItem key={option.id} value={option.id}>
                    {'|-- '.repeat(option.level)}
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loadingCategories && (
            <p className='mt-1 text-xs text-gray-500'>Loading categories...</p>
          )}
          {!loadingCategories &&
            parentOptions.length === 0 && (
            <p className='mt-1 text-xs text-gray-500'>
                No categories available in{' '}
              {modalCatalogName ?? 'this catalog'}.
            </p>
          )}
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Color</Label>
          <div className='mt-2 flex items-center gap-3'>
            <Input
              type='color'
              className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900'
              value={formData.color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                onFormDataChange((prev) => ({ ...prev, color: e.target.value }))
              }
            />
            <Input
              type='text'
              className='flex-1 rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
              value={formData.color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                onFormDataChange((prev) => ({ ...prev, color: e.target.value }))
              }
              placeholder='#10b981'
            />
          </div>
        </div>

        <div className='flex items-center justify-end gap-3 pt-4'>
          <Button
            className='rounded-md border border-border px-3 py-2 text-sm text-gray-300 hover:bg-muted/50'
            type='button'
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className='rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'
            type='button'
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
