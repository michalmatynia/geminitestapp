'use client';

import React, { type ReactNode, useState, useMemo } from 'react';

import { DocumentationSection } from './documentation-section';
import { cn } from '@/shared/utils';
import { SearchInput } from './search-input';

export type DocumentationListVariant = 'default' | 'warning' | 'recommendation' | 'error' | 'info';

export interface DocumentationListItem {
  label: ReactNode;
  value?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}

interface DocumentationListProps {
  title: string;
  items: Array<string | ReactNode | DocumentationListItem>;
  className?: string;
  listClassName?: string;
  ordered?: boolean;
  variant?: DocumentationListVariant;
  size?: 'xs' | 'sm' | 'md';
  searchable?: boolean;
  searchPlaceholder?: string;
}

/**
 * DocumentationList - A unified list component for documentation, AI insights, and metadata.
 * Supports multiple visual variants, ordered/unordered lists, custom item rendering, and searching.
 */
export function DocumentationList({
  title,
  items,
  className,
  listClassName,
  ordered = false,
  variant = 'default',
  size = 'md',
  searchable = false,
  searchPlaceholder = 'Search items...',
}: DocumentationListProps): React.JSX.Element | null {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchable || !query.trim()) return items;
    const term = query.toLowerCase().trim();
    
    return items.filter(item => {
      if (typeof item === 'string') return item.toLowerCase().includes(term);
      if (React.isValidElement(item)) return true; // Can't easily search elements
      
      const obj = item as DocumentationListItem;
      const labelText = typeof obj.label === 'string' ? obj.label : '';
      const descText = typeof obj.description === 'string' ? obj.description : '';
      
      return labelText.toLowerCase().includes(term) || descText.toLowerCase().includes(term);
    });
  }, [items, searchable, query]);

  if (!items || items.length === 0) return null;

  const variantStyles: Record<DocumentationListVariant, { section: string; list: string }> = {
    default: {
      section: '',
      list: 'text-gray-300',
    },
    warning: {
      section: 'bg-amber-500/5 border-amber-500/20',
      list: 'text-amber-200',
    },
    recommendation: {
      section: 'bg-blue-500/5 border-blue-500/20',
      list: 'text-blue-200',
    },
    error: {
      section: 'bg-red-500/5 border-red-500/20',
      list: 'text-red-200',
    },
    info: {
      section: 'bg-gray-500/5 border-gray-500/20',
      list: 'text-gray-200',
    },
  };

  const sizeStyles = {
    xs: 'text-[10px] space-y-0.5',
    sm: 'text-[11px] space-y-1',
    md: 'text-sm space-y-2',
  };

  const styles = variantStyles[variant];
  const ListTag = ordered ? 'ol' : 'ul';

  const renderItem = (item: string | ReactNode | DocumentationListItem, index: number) => {
    if (typeof item === 'string' || React.isValidElement(item)) {
      return (
        <li key={index} className='leading-relaxed'>
          {item}
        </li>
      );
    }

    const obj = item as DocumentationListItem;
    return (
      <li key={index} className='flex flex-col gap-0.5 leading-relaxed'>
        <div className='flex items-center gap-2'>
          {obj.icon && <span className='shrink-0 opacity-70'>{obj.icon}</span>}
          <span className='font-medium text-gray-100'>{obj.label}</span>
          {obj.value && <span className='ml-auto font-mono text-gray-400'>{obj.value}</span>}
        </div>
        {obj.description && (
          <div className='text-[11px] text-gray-500 ml-0.5'>{obj.description}</div>
        )}
      </li>
    );
  };

  return (
    <DocumentationSection
      title={title}
      className={cn(variant !== 'default' && 'mt-3 p-3', styles.section, className)}
    >
      {searchable && (
        <div className='mb-3'>
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            placeholder={searchPlaceholder}
            size='xs'
            variant='subtle'
          />
        </div>
      )}
      <ListTag
        className={cn(
          ordered ? 'list-decimal pl-5' : 'list-disc pl-4',
          sizeStyles[size],
          styles.list,
          listClassName
        )}
      >
        {filteredItems.map((item, index) => renderItem(item, index))}
      </ListTag>
    </DocumentationSection>
  );
}
