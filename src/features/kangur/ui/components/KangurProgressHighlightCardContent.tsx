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
  return (
    <div className={cn('min-w-0', className)}>
      <KangurSectionEyebrow
        as='p'
        className={cn('tracking-[0.18em]', eyebrowClassName)}
        style={eyebrowStyle}
      >
        {eyebrow}
      </KangurSectionEyebrow>
      <KangurCardTitle as='p' className={cn('mt-1', titleClassName)}>
        {title}
      </KangurCardTitle>
      <KangurCardDescription
        as='p'
        className={cn('mt-1 leading-5', descriptionClassName)}
        size='xs'
        style={descriptionStyle}
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
  return (
    <KangurStatusChip accent={accent} className={cn('self-start sm:shrink-0', className)}>
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
  return (
    <KangurProgressBar
      accent={accent}
      className={cn('mt-3', className)}
      data-testid={testId}
      size='sm'
      value={value}
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
