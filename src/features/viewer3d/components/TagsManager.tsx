'use client';

import { Plus } from 'lucide-react';
import type { JSX } from 'react';
import { Button, Input } from '@/shared/ui/primitives.public';
import { Tag, FormField } from '@/shared/ui/forms-and-actions.public';

interface TagsManagerProps {
  tags: string[];
  newTag: string;
  setNewTag: (val: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  isUploading: boolean;
}

export function TagsManager({
  tags,
  newTag,
  setNewTag,
  onAddTag,
  onRemoveTag,
  isUploading,
}: TagsManagerProps): JSX.Element {
  return (
    <FormField label='Tags'>
      <div className='space-y-2 mt-1'>
        <div className='flex gap-2'>
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddTag();
              }
            }}
            placeholder='Add tag...'
            className='bg-gray-800 border-gray-700 flex-1 h-9'
            disabled={isUploading}
          />
          <Button
            type='button'
            variant='secondary'
            size='icon'
            onClick={onAddTag}
            disabled={isUploading}
            className='h-9 w-9'
          >
            <Plus className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex flex-wrap gap-1 mt-2'>
          {tags.map((tag: string) => (
            <Tag
              key={tag}
              label={tag}
              onRemove={() => !isUploading && onRemoveTag(tag)}
              className='bg-gray-700 text-gray-300 border-none'
            />
          ))}
        </div>
      </div>
    </FormField>
  );
}
