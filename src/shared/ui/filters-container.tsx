'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { SectionPanel } from './section-panel';


interface FiltersContainerProps {
  title?: string;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  children: ReactNode;
  className?: string;
  gridClassName?: string;
}

export function FiltersContainer({
  title = 'Filters',
  onReset,
  hasActiveFilters = false,
  children,
  className,
  gridClassName,
}: FiltersContainerProps) {
  return (
    <SectionPanel className={cn('mb-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {title}
        </h3>
        {hasActiveFilters && onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 gap-2"
          >
            <X className="h-3 w-3" />
            Reset filters
          </Button>
        )}
      </div>

      <div className={cn('grid grid-cols-1 gap-3', gridClassName)}>
        {children}
      </div>
    </SectionPanel>
  );
}
