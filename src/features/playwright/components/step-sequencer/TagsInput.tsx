'use client';

import { X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Badge, Input, Label } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

type Props = {
  id?: string | undefined;
  label?: string | undefined;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string | undefined;
  className?: string | undefined;
};

export function TagsInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Add tag…',
  className,
}: Props): React.JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string): void => {
    const tag = raw.trim().toLowerCase();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setInputValue('');
  };

  const removeTag = (tag: string): void => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}

      {/* Tag chips + input row */}
      <div
        className='flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring cursor-text'
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge
            key={tag}
            variant='neutral'
            className='flex items-center gap-1 h-5 px-1.5 text-[11px]'
          >
            {tag}
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className='ml-0.5 rounded-full hover:text-destructive focus-visible:outline-none'
              aria-label={`Remove tag ${tag}`}
            >
              <X className='size-2.5' />
            </button>
          </Badge>
        ))}

        <Input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue) addTag(inputValue); }}
          placeholder={value.length === 0 ? placeholder : ''}
          className='h-5 min-w-[80px] flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0'
          aria-label={label ?? 'Tags input'}
        />
      </div>

      <p className='text-[11px] text-muted-foreground'>
        Press Enter or comma to add. Backspace removes the last tag.
      </p>
    </div>
  );
}
