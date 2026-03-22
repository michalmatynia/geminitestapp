'use client';

import React from 'react';

import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

type ValidationPanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function ValidationPanel({
  children,
  className,
}: ValidationPanelProps): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className={cn('border-border/60 bg-card/40', className)}>
      {children}
    </Card>
  );
}
