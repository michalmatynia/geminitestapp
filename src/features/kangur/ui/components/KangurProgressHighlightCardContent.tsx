import type { CSSProperties, ReactNode } from 'react';
import React from 'react';

import {
  KangurCardDescription,
  KangurCardTitle,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

// ── Progress Highlight Card Sub-components ───────────────────────────────────

export function KangurProgressHighlightHeader({
  eyebrow,
  eyebrowClassName,
  eyebrowStyle,
  title,
  titleClassName,
  description,
  descriptionClassName,
  descriptionStyle,
  className,
}: {
  eyebrow: ReactNode;
  eyebrowClassName?: string;
  eyebrowStyle?: CSSProperties;
  title: ReactNode;
  titleClassName?: string;
  description: ReactNode;
  descriptionClassName?: string;
  descriptionStyle?: CSSProperties;
  className?: string;
}): React.JSX.Element {
  const headerClassName = className;
  const eyebrowClass = eyebrowClassName;
  const eyebrowStyles = eyebrowStyle;
  const titleClass = titleClassName;
  const descriptionClass = descriptionClassName;
  const descriptionStyles = descriptionStyle;

  return (
    <div className={cn('min-w-0', headerClassName)}>
      <KangurSectionEyebrow
        as='p'
        className={cn('tracking-[0.18em]', eyebrowClass)}
        style={eyebrowStyles}
      >
        {eyebrow}
      </KangurSectionEyebrow>
      <KangurCardTitle as='p' className={cn('mt-1', titleClass)}>
        {title}
      </KangurCardTitle>
      <KangurCardDescription
        as='p'
        className={cn('mt-1 leading-5', descriptionClass)}
        size='xs'
        style={descriptionStyles}
      >
        {description}
      </KangurCardDescription>
    </div>
  );
}

export function KangurProgressHighlightChip({
  accent,
  label,
  className,
}: {
  accent: KangurAccent;
  label: ReactNode;
  className?: string;
}): React.JSX.Element {
  const chipAccent = accent;
  const chipClassName = className;

  return (
    <KangurStatusChip
      accent={chipAccent}
      className={cn('self-start sm:shrink-0', chipClassName)}
    >
      {label}
    </KangurStatusChip>
  );
}

export function KangurProgressHighlightBar({
  accent,
  value,
  testId,
  className,
}: {
  accent: KangurAccent;
  value: number;
  testId: string;
  className?: string;
}): React.JSX.Element {
  const barAccent = accent;
  const barValue = value;
  const barTestId = testId;
  const barClassName = className;

  return (
    <KangurProgressBar
      accent={barAccent}
      className={cn('mt-3', barClassName)}
      data-testid={barTestId}
      size='sm'
      value={barValue}
    />
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

type KangurProgressHighlightCardContentProps = {
  children: ReactNode;
};

export function KangurProgressHighlightCardContent({
  children,
}: KangurProgressHighlightCardContentProps): React.JSX.Element {
  return <>{children}</>;
}

export default KangurProgressHighlightCardContent;
