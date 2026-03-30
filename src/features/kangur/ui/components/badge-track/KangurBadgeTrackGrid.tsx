import { useTranslations } from 'next-intl';
import {
  KangurBadgeTrackSummaryCard,
  KangurBadgeTrackCardHeader,
  KangurBadgeTrackCardBody,
  KangurBadgeTrackCardBar,
  KANGUR_BADGE_TRACK_ACCENTS,
} from './KangurBadgeTrackSummaryCard';
import { KangurCardDescription } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { getProgressBadgeTrackSummaries } from '@/features/kangur/ui/services/progress';
import { translateKangurProgressWithFallback } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type KangurBadgeTrackGridProps = {
  className?: string;
  dataTestIdPrefix: string;
  emptyTestId: string;
  progress: KangurProgressState;
};

export default function KangurBadgeTrackGrid({
  className,
  dataTestIdPrefix,
  emptyTestId,
  progress,
}: KangurBadgeTrackGridProps): React.JSX.Element {
  const translations = useTranslations('KangurProgressRuntime');
  const trackTestIdPrefix = dataTestIdPrefix;
  const emptyTestIdValue = emptyTestId;
  const tracks = getProgressBadgeTrackSummaries(progress, {}, { translate: translations });

  if (tracks.length === 0) {
    return (
      <KangurCardDescription as='p' data-testid={emptyTestIdValue} size='sm'>
        {translateKangurProgressWithFallback(
          translations,
          'badgeGrid.empty',
          'Kolejne odznaki pojawiają się wraz z postępem.'
        )}
      </KangurCardDescription>
    );
  }

  return (
    <div className={cn('grid md:grid-cols-2', KANGUR_PANEL_GAP_CLASSNAME, className)}>
      {tracks.map((track) => {
        const accent = KANGUR_BADGE_TRACK_ACCENTS[track.key] ?? 'indigo';
        
        return (
          <KangurBadgeTrackSummaryCard
            dataTestId={`${trackTestIdPrefix}-${track.key}`}
            key={track.key}
          >
            <div className='flex flex-col kangur-panel-gap'>
              <KangurBadgeTrackCardHeader
                accent={accent}
                track={track}
              />
              <KangurBadgeTrackCardBody track={track} />
            </div>
            <KangurBadgeTrackCardBar
              accent={accent}
              testId={`${trackTestIdPrefix}-${track.key}-bar`}
              value={track.progressPercent}
            />
          </KangurBadgeTrackSummaryCard>
        );
      })}
    </div>
  );
}
