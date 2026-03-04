'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { Card } from '../../card';

interface DetailModalSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

export function DetailModalSection({
  title,
  description,
  children,
  className,
  titleClassName,
  contentClassName,
}: DetailModalSectionProps): React.JSX.Element {
  return (
    <Card variant='subtle-compact' padding='md' className={cn('border-border/60 bg-card/35', className)}>
      <div className='mb-4'>
        <h3 className={cn('text-sm font-medium text-white', titleClassName)}>{title}</h3>
        {description ? <p className='mt-1 text-xs text-gray-400'>{description}</p> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </Card>
  );
}
