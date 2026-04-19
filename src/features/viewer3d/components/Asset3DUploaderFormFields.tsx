'use client';

import { Input, Textarea, Checkbox, FormField } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import type { JSX, ChangeEvent } from 'react';

interface AssetFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  existingCategories: string[];
  isUploading: boolean;
}

export function AssetFormFields({
  name,
  setName,
  description,
  setDescription,
  category,
  setCategory,
  existingCategories,
  isUploading,
}: AssetFormFieldsProps): JSX.Element {
  return (
    <>
      <FormField label='Name'>
        <Input
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder='Enter asset name...'
          className='bg-gray-800 border-gray-700 h-9'
          disabled={isUploading}
        />
      </FormField>
      <FormField label='Description'>
        <Textarea
          value={description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder='Enter description...'
          className='bg-gray-800 border-gray-700 min-h-[60px] text-sm'
          disabled={isUploading}
        />
      </FormField>
      <FormField label='Category'>
        <Input
          value={category}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
          placeholder='Enter category...'
          list='upload-categories-list'
          className='bg-gray-800 border-gray-700 h-9'
          disabled={isUploading}
        />
        <datalist id='upload-categories-list'>
          {existingCategories.map((cat: string) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
      </FormField>
    </>
  );
}

interface VisibilityToggleProps {
  isPublic: boolean;
  setIsPublic: (is: boolean) => void;
  isUploading: boolean;
}

export function VisibilityToggle({
  isPublic,
  setIsPublic,
  isUploading,
}: VisibilityToggleProps): JSX.Element {
  return (
    <div
      className={`${UI_CENTER_ROW_SPACED_CLASSNAME} p-3 rounded-md border border-border/40 bg-gray-900/40`}
    >
      <Checkbox
        id='upload-is-public'
        checked={isPublic}
        onCheckedChange={(c: boolean | 'indeterminate') => setIsPublic(Boolean(c))}
        disabled={isUploading}
        aria-label='Toggle public visibility'
      />
      <label htmlFor='upload-is-public' className='cursor-pointer flex-1 text-sm'>
        Publicly accessible
      </label>
    </div>
  );
}
