import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_STYLES, type KangurAccent } from '../tokens';
import { kangurInfoCardVariants, type KangurInfoCardProps } from './KangurInfoCard';
import { kangurStatusChipVariants } from './KangurStatusChip';

export type KangurSummaryPanelProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<KangurInfoCardProps, 'accent' | 'padding'> & {
    align?: 'left' | 'center';
    description?: React.ReactNode;
    label?: React.ReactNode;
    labelAccent?: KangurAccent;
    title?: React.ReactNode;
    tone?: 'neutral' | 'accent';
  };

export function KangurSummaryPanel({
  accent = 'slate',
  align = 'left',
  children,
  className,
  description,
  label,
  labelAccent,
  padding = 'lg',
  title,
  tone = 'neutral',
  ...props
}: KangurSummaryPanelProps): React.JSX.Element {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ tone, padding }),
        tone === 'accent' &&
          cn(KANGUR_ACCENT_STYLES[accent].activeCard, KANGUR_ACCENT_STYLES[accent].activeText),
        'space-y-2',
        centered && 'text-center',
        className
      )}
      {...props}
    >
      {label ? (
        <span
          className={cn(
            kangurStatusChipVariants({ size: 'sm' }),
            KANGUR_ACCENT_STYLES[labelAccent ?? accent].badge,
            centered && 'mx-auto'
          )}
        >
          {label}
        </span>
      ) : null}
      {title ? (
        <div
          className={cn(
            'break-words text-2xl font-extrabold leading-tight',
            tone === 'accent'
              ? KANGUR_ACCENT_STYLES[accent].activeText
              : '[color:var(--kangur-page-text)]'
          )}
        >
          {title}
        </div>
      ) : null}
      {description ? (
        <p
          className={cn(
            'break-words text-sm leading-6',
            tone === 'accent'
              ? KANGUR_ACCENT_STYLES[accent].mutedText
              : '[color:var(--kangur-page-muted-text)]',
            centered && 'mx-auto max-w-2xl'
          )}
        >
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
