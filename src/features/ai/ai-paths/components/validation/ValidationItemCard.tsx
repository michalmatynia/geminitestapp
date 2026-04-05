import React from 'react';

import { Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

type ValidationItemCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function ValidationItemCard(props: ValidationItemCardProps): React.JSX.Element {
  const { children, className } = props;
  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className={cn('border-border/50 bg-card/40', className)}
    >
      {children}
    </Card>
  );
}
