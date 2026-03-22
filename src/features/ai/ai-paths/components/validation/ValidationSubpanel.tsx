'use client';

import React from 'react';

import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

type ValidationSubpanelProps = {
  children: React.ReactNode;
  className?: string;
  padding?: React.ComponentProps<typeof Card>['padding'];
};

export function ValidationSubpanel({
  children,
  className,
  padding = 'sm',
}: ValidationSubpanelProps): React.JSX.Element {
  return (
    <Card
      variant='subtle-compact'
      padding={padding}
      className={cn('border-border/60 bg-card/30', className)}
    >
      {children}
    </Card>
  );
}
