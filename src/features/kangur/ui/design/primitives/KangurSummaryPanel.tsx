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

const resolveKangurSummaryPanelToneClassName = ({
  accent,
  tone,
}: {
  accent: KangurAccent;
  tone: NonNullable<KangurSummaryPanelProps['tone']>;
}): string | undefined =>
  tone === 'accent'
    ? cn(KANGUR_ACCENT_STYLES[accent].activeCard, KANGUR_ACCENT_STYLES[accent].activeText)
    : undefined;

const resolveKangurSummaryPanelTextClassName = ({
  accent,
  tone,
  variant,
}: {
  accent: KangurAccent;
  tone: NonNullable<KangurSummaryPanelProps['tone']>;
  variant: 'description' | 'title';
}): string => {
  if (tone !== 'accent') {
    return variant === 'title'
      ? '[color:var(--kangur-page-text)]'
      : '[color:var(--kangur-page-muted-text)]';
  }

  return variant === 'title'
    ? KANGUR_ACCENT_STYLES[accent].activeText
    : KANGUR_ACCENT_STYLES[accent].mutedText;
};

function KangurSummaryPanelLabel(props: {
  accent: KangurAccent;
  centered: boolean;
  label: React.ReactNode;
  labelAccent?: KangurAccent;
}): React.JSX.Element {
  const { accent, centered, label, labelAccent } = props;

  return (
    <span
      className={cn(
        kangurStatusChipVariants({ size: 'sm' }),
        KANGUR_ACCENT_STYLES[labelAccent ?? accent].badge,
        centered && 'mx-auto'
      )}
    >
      {label}
    </span>
  );
}

function KangurSummaryPanelOptionalLabel(props: {
  accent: KangurAccent;
  centered: boolean;
  label?: React.ReactNode;
  labelAccent?: KangurAccent;
}): React.JSX.Element | null {
  const { accent, centered, label, labelAccent } = props;

  return label ? (
    <KangurSummaryPanelLabel
      accent={accent}
      centered={centered}
      label={label}
      labelAccent={labelAccent}
    />
  ) : null;
}

function KangurSummaryPanelTitle(props: {
  accent: KangurAccent;
  title: React.ReactNode;
  tone: NonNullable<KangurSummaryPanelProps['tone']>;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'break-words text-2xl font-extrabold leading-tight',
        resolveKangurSummaryPanelTextClassName({
          accent: props.accent,
          tone: props.tone,
          variant: 'title',
        })
      )}
    >
      {props.title}
    </div>
  );
}

function KangurSummaryPanelOptionalTitle(props: {
  accent: KangurAccent;
  title?: React.ReactNode;
  tone: NonNullable<KangurSummaryPanelProps['tone']>;
}): React.JSX.Element | null {
  const { accent, title, tone } = props;

  return title ? <KangurSummaryPanelTitle accent={accent} title={title} tone={tone} /> : null;
}

function KangurSummaryPanelDescription(props: {
  accent: KangurAccent;
  centered: boolean;
  description: React.ReactNode;
  tone: NonNullable<KangurSummaryPanelProps['tone']>;
}): React.JSX.Element {
  return (
    <p
      className={cn(
        'break-words text-sm leading-6',
        resolveKangurSummaryPanelTextClassName({
          accent: props.accent,
          tone: props.tone,
          variant: 'description',
        }),
        props.centered && 'mx-auto max-w-2xl'
      )}
    >
      {props.description}
    </p>
  );
}

function KangurSummaryPanelOptionalDescription(props: {
  accent: KangurAccent;
  centered: boolean;
  description?: React.ReactNode;
  tone: NonNullable<KangurSummaryPanelProps['tone']>;
}): React.JSX.Element | null {
  const { accent, centered, description, tone } = props;

  return description ? (
    <KangurSummaryPanelDescription
      accent={accent}
      centered={centered}
      description={description}
      tone={tone}
    />
  ) : null;
}

export function KangurSummaryPanel(props: KangurSummaryPanelProps): React.JSX.Element {
  const {
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
    ...restProps
  } = props;
  const centered = align === 'center';

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ tone, padding }),
        resolveKangurSummaryPanelToneClassName({ accent, tone }),
        'kangur-panel-shell',
        'space-y-2',
        centered && 'text-center',
        className
      )}
      {...restProps}
    >
      <KangurSummaryPanelOptionalLabel
        accent={accent}
        centered={centered}
        label={label}
        labelAccent={labelAccent}
      />
      <KangurSummaryPanelOptionalTitle accent={accent} title={title} tone={tone} />
      <KangurSummaryPanelOptionalDescription
        accent={accent}
        centered={centered}
        description={description}
        tone={tone}
      />
      {children}
    </div>
  );
}
