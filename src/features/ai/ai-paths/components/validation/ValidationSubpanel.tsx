import type React from 'react';

import { type Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

export type ValidationSubpanelProps = {
  children: React.ReactNode;
  className?: string;
  padding?: React.ComponentProps<typeof Card>['padding'];
};

export const validationSubpanelClassName = (className?: string): string =>
  cn('border-border/60 bg-card/30', className);
