import * as React from 'react';

import { cn } from '@/shared/utils';

import { KANGUR_ACCENT_STYLES } from '../tokens';
import { kangurInfoCardVariants, type KangurInfoCardProps } from './KangurInfoCard';

export type KangurMetricCardProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<KangurInfoCardProps, 'accent' | 'padding'> & {
    align?: 'left' | 'center';
    description?: React.ReactNode;
    label: React.ReactNode;
    value: React.ReactNode;
    valueClassName?: string;
  };

export function KangurMetricCard({
  accent = 'slate',
  align = 'left',
  children,
  className,
  description,
  label,
  padding = 'md',
  value,
  valueClassName,
  ...props
}: KangurMetricCardProps): React.JSX.Element {
  const centered = align === 'center';
  const tone = accent === 'slate' ? 'neutral' : 'accent';
  const metricAccent = accent;
  const metricCardClassName = className;
  const metricDescription = description;
  const metricLabel = label;
  const metricPadding = padding;
  const metricTone = tone;
  const metricValue = value;
  const metricValueClassName = valueClassName;

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ tone: metricTone, padding: metricPadding }),
        metricTone === 'accent' &&
          cn(KANGUR_ACCENT_STYLES[metricAccent].activeCard, KANGUR_ACCENT_STYLES[metricAccent].activeText),
        'space-y-1.5',
        centered && 'text-center',
        metricCardClassName
      )}
      {...props}
    >
      <div
        className={cn(
          'break-words text-[11px] font-bold uppercase tracking-wide',
          metricTone === 'accent'
            ? KANGUR_ACCENT_STYLES[metricAccent].activeText
            : '[color:var(--kangur-page-muted-text)]'
        )}
      >
        {metricLabel}
      </div>
      <div
        className={cn(
          'break-words text-3xl font-extrabold leading-none',
          metricTone === 'accent'
            ? KANGUR_ACCENT_STYLES[metricAccent].activeText
            : '[color:var(--kangur-page-text)]',
          metricValueClassName
        )}
      >
        {metricValue}
      </div>
      {metricDescription ? (
        <div
          className={cn(
            'break-words text-xs leading-5',
            metricTone === 'accent'
              ? KANGUR_ACCENT_STYLES[metricAccent].mutedText
              : '[color:var(--kangur-page-muted-text)]'
          )}
        >
          {metricDescription}
        </div>
      ) : null}
      {children}
    </div>
  );
}
