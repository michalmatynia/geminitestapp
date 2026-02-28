'use client';

import React from 'react';

import { Input, Textarea, Label, FormModal, SelectSimple } from '@/shared/ui';

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
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Category' : 'Create Category'}
      onSave={onSave}
      isSaving={saving}
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
            <SelectSimple
              value={formData.catalogId}
              onValueChange={(value: string): void => {
                onFormDataChange((prev) => ({
                  ...prev,
                  catalogId: value,
                  parentId: prev.catalogId !== value ? null : prev.parentId,
                }));
                onCatalogChange(value);
              }}
              options={catalogs.map((catalog) => ({
                value: catalog.id,
                label: catalog.name + (catalog.isDefault ? ' (Default)' : ''),
              }))}
              placeholder='Select catalog'
              triggerClassName='w-full bg-gray-900 border-border text-white'
            />
          </div>
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Parent Category</Label>
          <div className='mt-2'>
            <SelectSimple
              value={formData.parentId ?? '__root__'}
              onValueChange={(value: string): void =>
                onFormDataChange((prev) => ({
                  ...prev,
                  parentId: value === '__root__' ? null : value,
                }))
              }
              disabled={loadingCategories}
              options={[
                { value: '__root__', label: 'No parent (root)' },
                ...parentOptions.map((option) => ({
                  value: option.id,
                  label: '|-- '.repeat(option.level) + option.name,
                })),
              ]}
              placeholder='Select parent category'
              triggerClassName='w-full bg-gray-900 border-border text-white'
            />
          </div>
          {loadingCategories && <p className='mt-1 text-xs text-gray-500'>Loading categories...</p>}
          {!loadingCategories && parentOptions.length === 0 && (
            <p className='mt-1 text-xs text-gray-500'>
              No categories available in {modalCatalogName ?? 'this catalog'}.
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
      </div>
    </FormModal>
  );
}
