'use client';

import React from 'react';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { Clock } from 'lucide-react';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { cn } from '@/features/kangur/shared/utils';

export function KangurAssignmentManagerCardHeader({
  title,
  description,
  priority,
}: {
  title: string;
  description: string | null;
  priority?: number;
}) {
  return (
    <div className='space-y-1.5'>
      <div className='flex items-start justify-between gap-3'>
        <KangurCardTitle size='sm'>{title}</KangurCardTitle>
        {priority !== undefined && <KangurAssignmentPriorityChip priority={priority} />}
      </div>
      {description && <KangurCardDescription lineLimit={2}>{description}</KangurCardDescription>}
    </div>
  );
}

export function KangurAssignmentManagerCardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
}) {
  return (
    <KangurGlassPanel
      className={cn('flex flex-col h-full', className)}
      padding='md'
      surface='solid'
      variant='soft'
      data-testid={testId}
    >
      {children}
    </KangurGlassPanel>
  );
}
