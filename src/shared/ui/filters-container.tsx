import { X } from 'lucide-react';
import { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { SectionHeader } from './section-header';

interface FiltersContainerProps {
  title?: string;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  children: ReactNode;
  className?: string;
  gridClassName?: string;
}

export function FiltersContainer(props: FiltersContainerProps) {
  const {
    title = 'Filters',
    onReset,
    hasActiveFilters = false,
    children,
    className,
    gridClassName,
  } = props;

  return (
    <div
      className={cn('mb-4 space-y-3 rounded-lg border border-border/60 bg-card/40 p-4', className)}
    >
      <SectionHeader
        title={title}
        size='xs'
        actions={
          hasActiveFilters && onReset ? (
            <Button variant='ghost' size='sm' onClick={onReset} className='h-8 gap-2'>
              <X className='h-3 w-3' />
              Reset filters
            </Button>
          ) : undefined
        }
      />

      <div className={cn('grid grid-cols-1 gap-3', gridClassName)}>{children}</div>
    </div>
  );
}
