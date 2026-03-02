import React, { type ReactNode } from 'react';

import { DocumentationSection } from './documentation-section';
import { cn } from '@/shared/utils';

interface DocumentationListProps {
  title: string;
  items: Array<string | ReactNode>;
  className?: string;
  listClassName?: string;
  ordered?: boolean;
}

export function DocumentationList({
  title,
  items,
  className,
  listClassName,
  ordered = false,
}: DocumentationListProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null;

  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <DocumentationSection title={title} className={className}>
      <ListTag
        className={cn('space-y-2', ordered ? 'list-decimal pl-5' : '', listClassName)}
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
