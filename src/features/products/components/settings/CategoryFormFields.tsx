'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/layout';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Textarea } from '@/shared/ui/textarea';

import { useCategoryFormContext, type CategoryFormData } from './CategoryFormContext';

const ROOT_PARENT_VALUE = '__root__';
const INPUT_CLASSNAME =
  'mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white';

function CategoryEnglishNameField(): React.JSX.Element {
  const { formData, onFormDataChange } = useCategoryFormContext();
  const nameId = `category-name-${React.useId().replace(/:/g, '')}`;

  return (
    <div>
      <Label htmlFor={nameId} className='text-xs text-gray-400'>
        English Name
      </Label>
      <Input
        id={nameId}
        className={INPUT_CLASSNAME}
        value={formData.name}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          onFormDataChange((prev: CategoryFormData) => ({ ...prev, name: event.target.value }))
        }
        placeholder='Category name in English'
        aria-label='English category name'
        title='English category name'
      />
    </div>
  );
}

function CategoryPolishNameField(): React.JSX.Element {
  const { formData, onFormDataChange } = useCategoryFormContext();
  const polishNameId = `category-polish-name-${React.useId().replace(/:/g, '')}`;

  return (
    <div>
      <Label htmlFor={polishNameId} className='text-xs text-gray-400'>
        Polish Name
      </Label>
      <Input
        id={polishNameId}
        className={INPUT_CLASSNAME}
        value={formData.namePl}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          onFormDataChange((prev: CategoryFormData) => ({ ...prev, namePl: event.target.value }))
        }
        placeholder='Category name in Polish'
        aria-label='Polish category name'
        title='Polish category name'
      />
    </div>
  );
}

function CategoryDescriptionField(): React.JSX.Element {
  const { formData, onFormDataChange } = useCategoryFormContext();
  const descriptionId = `category-description-${React.useId().replace(/:/g, '')}`;

  return (
    <div>
      <Label htmlFor={descriptionId} className='text-xs text-gray-400'>
        Description
      </Label>
      <Textarea
        id={descriptionId}
        className={INPUT_CLASSNAME}
        rows={3}
        value={formData.description}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
          onFormDataChange((prev: CategoryFormData) => ({
            ...prev,
            description: event.target.value,
          }))
        }
        placeholder='Optional description'
        aria-label='Optional description'
        title='Optional description'
      />
    </div>
  );
}

function CategoryCatalogField(): React.JSX.Element {
  const { catalogs, formData, onCatalogChange, onFormDataChange } = useCategoryFormContext();
  const catalogOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      catalogs.map((catalog) => ({
        value: catalog.id,
        label: catalog.name + (catalog.isDefault ? ' (Default)' : ''),
      })),
    [catalogs]
  );

  return (
    <div>
      <Label className='text-xs text-gray-400'>Catalog</Label>
      <div className='mt-2'>
        <SelectSimple
          value={formData.catalogId}
          onValueChange={(value: string): void => {
            onFormDataChange((prev: CategoryFormData) => ({
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
          title='Select catalog'
        />
      </div>
    </div>
  );
}

function CategoryParentField(): React.JSX.Element {
  const { formData, loadingCategories, modalCatalogName, onFormDataChange, parentOptions } =
    useCategoryFormContext();
  const parentSelectOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => [
      { value: ROOT_PARENT_VALUE, label: 'No parent (root)' },
      ...parentOptions.map((option) => ({
        value: option.id,
        label: '|-- '.repeat(option.level) + option.name,
      })),
    ],
    [parentOptions]
  );

  return (
    <div>
      <Label className='text-xs text-gray-400'>Parent Category</Label>
      <div className='mt-2'>
        <SelectSimple
          value={formData.parentId ?? ROOT_PARENT_VALUE}
          onValueChange={(value: string): void =>
            onFormDataChange((prev: CategoryFormData) => ({
              ...prev,
              parentId: value === ROOT_PARENT_VALUE ? null : value,
            }))
          }
          disabled={loadingCategories}
          options={parentSelectOptions}
          placeholder='Select parent category'
          triggerClassName='w-full bg-gray-900 border-border text-white'
          ariaLabel='Parent category'
          title='Select parent category'
        />
      </div>
      {loadingCategories && <p className='mt-1 text-xs text-gray-500'>Loading categories...</p>}
      {!loadingCategories && parentOptions.length === 0 && (
        <p className='mt-1 text-xs text-gray-500'>
          No categories available in {modalCatalogName ?? 'this catalog'}.
        </p>
      )}
    </div>
  );
}

function CategoryColorField(): React.JSX.Element {
  const { formData, onFormDataChange } = useCategoryFormContext();
  const fieldId = React.useId().replace(/:/g, '');
  const colorPickerId = `category-color-picker-${fieldId}`;
  const colorValueId = `category-color-value-${fieldId}`;

  return (
    <div>
      <Label className='text-xs text-gray-400'>Color</Label>
      <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} mt-2`}>
        <Input
          type='color'
          id={colorPickerId}
          className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900'
          value={formData.color}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            onFormDataChange((prev: CategoryFormData) => ({ ...prev, color: event.target.value }))
          }
          aria-label='Category color picker'
          title={colorPickerId}
        />
        <Input
          type='text'
          id={colorValueId}
          className='flex-1 rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
          value={formData.color}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            onFormDataChange((prev: CategoryFormData) => ({ ...prev, color: event.target.value }))
          }
          placeholder='#10b981'
          aria-label='Category color value'
          title='#10b981'
        />
      </div>
    </div>
  );
}

export function CategoryFormFields(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <CategoryEnglishNameField />
      <CategoryPolishNameField />
      <CategoryDescriptionField />
      <CategoryCatalogField />
      <CategoryParentField />
      <CategoryColorField />
    </div>
  );
}
