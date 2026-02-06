import { cn } from '@/shared/utils';

import type { HTMLAttributes, ReactNode } from 'react';

type SectionPanelVariant = 'default' | 'compact' | 'subtle' | 'subtle-compact' | 'danger';

const variantStyles: Record<SectionPanelVariant, string> = {
  default: 'rounded-lg border bg-card p-4',
  compact: 'rounded-lg border bg-card p-3',
  subtle: 'rounded-lg border bg-card/60 p-4 backdrop-blur',
  'subtle-compact': 'rounded-lg border bg-card/60 p-3 backdrop-blur',
  danger: 'rounded-lg border border-red-500/50 bg-red-500/10 p-4',
};

type SectionPanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: SectionPanelVariant;
};

export function SectionPanel({
  children,
  className,
  variant = 'default',
  ...props
}: SectionPanelProps) {
  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
}
