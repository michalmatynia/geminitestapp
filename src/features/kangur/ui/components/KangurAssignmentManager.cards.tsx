'use client';

import React from 'react';
import {
  KangurCardDescription,
  KangurCardTitle,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { cn } from '@/features/kangur/shared/utils';
import type { KangurAssignmentSnapshot } from '@kangur/platform';

export function KangurAssignmentManagerCardHeader({
  title,
  description,
  priority,
}: {
  title: string;
  description: string | null;
  priority?: KangurAssignmentSnapshot['priority'];
}): React.JSX.Element {
  return (
    <div className='space-y-1.5'>
      <div className='flex items-start justify-between gap-3'>
        <KangurCardTitle size='sm'>{title}</KangurCardTitle>
        {priority !== undefined && <KangurAssignmentPriorityChip priority={priority} />}
      </div>
      {description ? (
        <KangurCardDescription className='line-clamp-2'>{description}</KangurCardDescription>
      ) : null}
    </div>
  );
}

export function KangurAssignmentManagerCardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('mt-auto pt-4', className)}>
      <div className='flex flex-wrap items-center gap-2'>{children}</div>
    </div>
  );
}

export function KangurAssignmentManagerItemCard({
  children,
  className,
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}): React.JSX.Element {
  return (
    <KangurGlassPanel
      className={cn('flex h-full flex-col', className)}
      padding='md'
      surface='solid'
      variant='soft'
      data-testid={testId}
    >
      {children}
    </KangurGlassPanel>
  );
}
