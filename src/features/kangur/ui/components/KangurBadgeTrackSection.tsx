import React, { type ReactNode } from 'react';
import KangurBadgeTrackGrid from '@/features/kangur/ui/components/KangurBadgeTrackGrid';
import { KangurSectionEyebrow } from '@/features/kangur/ui/design/primitives';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

// ── Badge Track Section Sub-components ───────────────────────────────────────

export function KangurBadgeTrackSectionHeader({
  heading = 'Ścieżki odznak',
  headingAs = 'p',
  className,
}: {
  heading?: ReactNode;
  headingAs?: 'div' | 'p' | 'span';
  className?: string;
}): React.JSX.Element {
  return (
    <KangurSectionEyebrow as={headingAs} className={className}>
      {heading}
    </KangurSectionEyebrow>
  );
}

// ── Main Section Component ───────────────────────────────────────────────────

type KangurBadgeTrackSectionProps = {
  className?: string;
  dataTestIdPrefix: string;
  emptyTestId: string;
  gridClassName?: string;
  heading?: ReactNode;
  headingAs?: 'div' | 'p' | 'span';
  headingClassName?: string;
  progress: KangurProgressState;
};

export function KangurBadgeTrackSection({
  className,
  dataTestIdPrefix,
  emptyTestId,
  gridClassName,
  heading = 'Ścieżki odznak',
  headingAs = 'p',
  headingClassName,
  progress,
}: KangurBadgeTrackSectionProps): React.JSX.Element {
  const headerProps = {
    className: headingClassName,
    heading,
    headingAs,
  };
  const gridProps = {
    className: gridClassName,
    dataTestIdPrefix,
    emptyTestId,
    progress,
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <KangurBadgeTrackSectionHeader {...headerProps} />
      <KangurBadgeTrackGrid {...gridProps} />
    </div>
  );
}
