import { X } from 'lucide-react';
import { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { insetPanelVariants } from './InsetPanel';
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
    <section
      className={cn(insetPanelVariants({ padding: 'md' }), 'mb-4 space-y-3', className)}
      aria-label={typeof title === 'string' ? title : 'Filters'}
    >
      <SectionHeader
        title={title}
        size='xs'
        actions={
          hasActiveFilters && onReset ? (
            <Button variant='ghost' size='sm' onClick={onReset} className='h-8 gap-2'>
              <X className='h-3 w-3' aria-hidden='true' />
              Reset filters
            </Button>
          ) : undefined
        }
      />

      <div className={cn('grid grid-cols-1 gap-3', gridClassName)}>{children}</div>
    </section>
  );
}
