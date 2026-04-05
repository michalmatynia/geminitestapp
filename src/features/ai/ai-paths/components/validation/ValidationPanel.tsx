import React from 'react';

import { Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

type ValidationPanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function ValidationPanel(props: ValidationPanelProps): React.JSX.Element {
  const { children, className } = props;
  return (
    <Card variant='subtle' padding='md' className={cn('border-border/60 bg-card/40', className)}>
      {children}
    </Card>
  );
}
