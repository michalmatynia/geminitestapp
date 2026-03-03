import React, { type ReactNode } from 'react';

import { DocumentationSection } from './documentation-section';
import { cn } from '@/shared/utils';

export type DocumentationListVariant = 'default' | 'warning' | 'recommendation' | 'error' | 'info';

interface DocumentationListProps {
  title: string;
  items: Array<string | ReactNode>;
  className?: string;
  listClassName?: string;
  ordered?: boolean;
  variant?: DocumentationListVariant;
  size?: 'xs' | 'sm' | 'md';
}

/**
 * DocumentationList - A unified list component for documentation and AI insights.
 * Supports multiple visual variants, ordered/unordered lists, and custom item rendering.
 */
export function DocumentationList({
  title,
  items,
  className,
  listClassName,
  ordered = false,
  variant = 'default',
  size = 'md',
}: DocumentationListProps): React.JSX.Element | null {
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

  return (
    <DocumentationSection
      title={title}
      className={cn(variant !== 'default' && 'mt-3 p-3', styles.section, className)}
    >
      <ListTag
        className={cn(
          ordered ? 'list-decimal pl-5' : 'list-disc pl-4',
          sizeStyles[size],
          styles.list,
          listClassName
        )}
      >
        {items.map((item, index) => (
          <li key={index} className='leading-relaxed'>
            {item}
          </li>
        ))}
      </ListTag>
    </DocumentationSection>
  );
}
