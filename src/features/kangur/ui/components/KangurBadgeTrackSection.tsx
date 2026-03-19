import React, { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import KangurBadgeTrackGrid from '@/features/kangur/ui/components/KangurBadgeTrackGrid';
import { KangurSectionEyebrow } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

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
  const headerClassName = className;
  const headerAs = headingAs;

  return (
    <KangurSectionEyebrow as={headerAs} className={headerClassName}>
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
  heading,
  headingAs = 'p',
  headingClassName,
  progress,
}: KangurBadgeTrackSectionProps): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.sessions');
  const headerProps = {
    className: headingClassName,
    heading: heading ?? translations('badgeTracksHeading'),
    headingAs,
  };
  const gridProps = {
    className: gridClassName,
    dataTestIdPrefix,
    emptyTestId,
    progress,
  };

  return (
    <div className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME, className)}>
      <KangurBadgeTrackSectionHeader {...headerProps} />
      <KangurBadgeTrackGrid {...gridProps} />
    </div>
  );
}
