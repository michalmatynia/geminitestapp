import React from 'react';

import { DocumentationSection } from './documentation-section';
import { cn } from '@/shared/utils';

interface AiInsightListProps {
  title: string;
  items: string[];
  variant?: 'warning' | 'recommendation' | 'error' | 'info';
  className?: string;
  listClassName?: string;
}

export function AiInsightList({
  title,
  items,
  variant = 'warning',
  className,
  listClassName,
}: AiInsightListProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null;

  const variantStyles = {
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

  const styles = variantStyles[variant];

  return (
    <DocumentationSection
      title={title}
      className={cn('mt-3 p-3', styles.section, className)}
    >
      <ul
        className={cn(
          'list-disc space-y-1 pl-4 text-[11px]',
          styles.list,
          listClassName
        )}
      >
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </DocumentationSection>
  );
}
