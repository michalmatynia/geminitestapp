'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/layout';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Textarea } from '@/shared/ui/textarea';

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
  const fieldId = React.useId().replace(/:/g, '');
  const nameId = `category-name-${fieldId}`;
  const polishNameId = `category-polish-name-${fieldId}`;
  const descriptionId = `category-description-${fieldId}`;
  const colorPickerId = `category-color-picker-${fieldId}`;
  const colorValueId = `category-color-value-${fieldId}`;
  const catalogOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      catalogs.map((catalog) => ({
        value: catalog.id,
        label: catalog.name + (catalog.isDefault ? ' (Default)' : ''),
      })),
    [catalogs]
  );
  const parentSelectOptions = useMemo<Array<LabeledOptionDto<string>>>(() => {
    const options: Array<LabeledOptionDto<string>> = [
      { value: '__root__', label: 'No parent (root)' },
    ];
    parentOptions.forEach((option) => {
      options.push({
        value: option.id,
        label: '|-- '.repeat(option.level) + option.name,
      });
    });
    return options;
  }, [parentOptions]);
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
          <Label htmlFor={nameId} className='text-xs text-gray-400'>
            English Name
          </Label>
          <Input
            id={nameId}
            className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onFormDataChange((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder='Category name in English'
            aria-label='English category name'
            title='English category name'
          />
        </div>

        <div>
          <Label htmlFor={polishNameId} className='text-xs text-gray-400'>
            Polish Name
          </Label>
          <Input
            id={polishNameId}
            className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
            value={formData.namePl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              onFormDataChange((prev) => ({ ...prev, namePl: e.target.value }))
            }
            placeholder='Category name in Polish'
            aria-label='Polish category name'
            title='Polish category name'
          />
        </div>

        <div>
          <Label htmlFor={descriptionId} className='text-xs text-gray-400'>
            Description
          </Label>
          <Textarea
            id={descriptionId}
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
           aria-label='Optional description' title='Optional description'/>
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
              options={catalogOptions}
              placeholder='Select catalog'
              triggerClassName='w-full bg-gray-900 border-border text-white'
              ariaLabel='Catalog'
             title='Select catalog'/>
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
              options={parentSelectOptions}
              placeholder='Select parent category'
              triggerClassName='w-full bg-gray-900 border-border text-white'
              ariaLabel='Parent category'
             title='Select parent category'/>
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
          <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} mt-2`}>
            <Input
              type='color'
              id={colorPickerId}
              className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900'
              value={formData.color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                onFormDataChange((prev) => ({ ...prev, color: e.target.value }))
              }
              aria-label='Category color picker'
             title={colorPickerId}/>
            <Input
              type='text'
              id={colorValueId}
              className='flex-1 rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
              value={formData.color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                onFormDataChange((prev) => ({ ...prev, color: e.target.value }))
              }
              placeholder='#10b981'
              aria-label='Category color value'
             title='#10b981'/>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
