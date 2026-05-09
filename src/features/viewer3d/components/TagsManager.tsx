/**
 * Tags Manager Component
 * 
 * UI component for managing asset tags with add/remove functionality.
 * Features:
 * - Input field for new tag entry
 * - Enter key support for quick tag addition
 * - Visual tag display with remove buttons
 * - Disabled state during upload operations
 * - Responsive tag layout
 * 
 * Client-side component for tag management UI
 */

'use client';

import { Plus } from 'lucide-react';
import type { JSX } from 'react';
import { Button, Input } from '@/shared/ui/primitives.public';
import { Tag, FormField } from '@/shared/ui/forms-and-actions.public';

/**
 * Props for the TagsManager component
 */
interface TagsManagerProps {
  /** Current list of tags */
  tags: string[];
  /** New tag input value */
  newTag: string;
  /** Callback to update new tag input */
  setNewTag: (val: string) => void;
  /** Callback to add the new tag */
  onAddTag: () => void;
  /** Callback to remove a tag */
  onRemoveTag: (tag: string) => void;
  /** Whether upload is in progress (disables input) */
  isUploading: boolean;
}

/**
 * Renders a tag management interface with input and tag display
 * Allows users to add and remove tags with keyboard support
 */
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
        {/* Input row with add button */}
        <div className='flex gap-2'>
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              // Support Enter key for quick tag addition
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
        {/* Display current tags with remove buttons */}
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
