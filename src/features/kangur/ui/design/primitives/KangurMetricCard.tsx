import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

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

const resolveKangurMetricTone = (
  accent: NonNullable<KangurMetricCardProps['accent']>
): 'accent' | 'neutral' => (accent === 'slate' ? 'neutral' : 'accent');

const resolveKangurMetricCardToneClassName = ({
  accent,
  tone,
}: {
  accent: NonNullable<KangurMetricCardProps['accent']>;
  tone: 'accent' | 'neutral';
}): string | undefined =>
  tone === 'accent'
    ? cn(KANGUR_ACCENT_STYLES[accent].activeCard, KANGUR_ACCENT_STYLES[accent].activeText)
    : undefined;

const resolveKangurMetricTextClassName = ({
  accent,
  tone,
  variant,
}: {
  accent: NonNullable<KangurMetricCardProps['accent']>;
  tone: 'accent' | 'neutral';
  variant: 'description' | 'label' | 'value';
}): string => {
  if (tone !== 'accent') {
    return variant === 'value'
      ? '[color:var(--kangur-page-text)]'
      : '[color:var(--kangur-page-muted-text)]';
  }

  return variant === 'description'
    ? KANGUR_ACCENT_STYLES[accent].mutedText
    : KANGUR_ACCENT_STYLES[accent].activeText;
};

function KangurMetricDescription(props: {
  accent: NonNullable<KangurMetricCardProps['accent']>;
  description: React.ReactNode;
  tone: 'accent' | 'neutral';
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'break-words text-xs leading-5',
        resolveKangurMetricTextClassName({
          accent: props.accent,
          tone: props.tone,
          variant: 'description',
        })
      )}
    >
      {props.description}
    </div>
  );
}

export function KangurMetricCard(props: KangurMetricCardProps): React.JSX.Element {
  const {
    accent = 'slate',
    align = 'left',
    children,
    className,
    description,
    label,
    padding = 'md',
    value,
    valueClassName,
    ...restProps
  } = props;
  const centered = align === 'center';
  const tone = resolveKangurMetricTone(accent);
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
        resolveKangurMetricCardToneClassName({
          accent: metricAccent,
          tone: metricTone,
        }),
        'kangur-panel-shell',
        'space-y-1.5',
        centered && 'text-center',
        metricCardClassName
      )}
      {...restProps}
    >
      <div
        className={cn(
          'break-words text-[11px] font-bold uppercase tracking-wide',
          resolveKangurMetricTextClassName({
            accent: metricAccent,
            tone: metricTone,
            variant: 'label',
          })
        )}
      >
        {metricLabel}
      </div>
      <div
        className={cn(
          'break-words text-3xl font-extrabold leading-none',
          resolveKangurMetricTextClassName({
            accent: metricAccent,
            tone: metricTone,
            variant: 'value',
          }),
          metricValueClassName
        )}
      >
        {metricValue}
      </div>
      {metricDescription ? (
        <KangurMetricDescription
          accent={metricAccent}
          description={metricDescription}
          tone={metricTone}
        />
      ) : null}
      {children}
    </div>
  );
}
