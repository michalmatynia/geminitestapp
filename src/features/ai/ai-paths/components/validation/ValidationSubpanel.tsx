import React from 'react';

import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

export type ValidationSubpanelProps = {
  children: React.ReactNode;
  className?: string;
  padding?: React.ComponentProps<typeof Card>['padding'];
};

export const validationSubpanelClassName = (className?: string): string =>
  cn('border-border/60 bg-card/30', className);
