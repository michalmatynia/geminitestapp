import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { KangurActivitySummaryCard } from '@/features/kangur/ui/components/summary-cards/KangurActivitySummaryCard';
import { KangurBadgeTrackSection } from '@/features/kangur/ui/components/badge-track/KangurBadgeTrackSection';
import {
  KangurProgressHighlightCardContent,
  KangurProgressHighlightHeader,
  KangurProgressHighlightChip,
  KangurProgressHighlightBar,
} from '@/features/kangur/ui/components/KangurProgressHighlightCardContent';
import {
  KangurCardDescription,
  KangurCardTitle,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetaText,
  KangurMetricCard,
  KangurPanelRow,
  KangurProgressBar,
  KangurSectionEyebrow,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  getCurrentLevel,
  getNextLevel,
  getNextLockedBadge,
  getProgressAverageAccuracy,
  getProgressAverageXpPerSession,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { GAME_HOME_PLAYER_PROGRESS_SHELL_CLASSNAME } from '@/features/kangur/ui/pages/GameHome.constants';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type PlayerProgressCardProps = {
  progress: KangurProgressState;
};

const resolvePlayerProgressSummary = (
  progressContent: { summary?: string | null; title?: string | null } | null | undefined,
  translations: ReturnType<typeof useTranslations<'KangurPlayerProgress'>>
): { progressSummary: string; progressTitle: string } => ({
  progressTitle: progressContent?.title ?? translations('fallbackTitle'),
  progressSummary: progressContent?.summary ?? translations('fallbackSummary'),
});

function PlayerProgressLevelMeta(props: {
  nextLevel: ReturnType<typeof getNextLevel>;
  translations: ReturnType<typeof useTranslations<'KangurPlayerProgress'>>;
  xpIntoLevel: number;
  xpNeeded: number;
}): React.JSX.Element {
  return (
    <KangurMetaText
      as='div'
      className={`mb-1 ${KANGUR_STACK_COMPACT_CLASSNAME} min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between`}
      size='xs'
    >
      <span>{props.xpIntoLevel} XP</span>
      {props.nextLevel ? (
        <span>
          {props.translations('nextLevel', {
            level: props.nextLevel.level,
            xp: props.xpNeeded - props.xpIntoLevel,
          })}
        </span>
      ) : (
        <span>{props.translations('maxLevel')}</span>
      )}
    </KangurMetaText>
  );
}

function PlayerProgressTopActivitySection(props: {
  topActivity: ReturnType<typeof getProgressTopActivities>[number] | null;
  translations: ReturnType<typeof useTranslations<'KangurPlayerProgress'>>;
}): React.JSX.Element | null {
  if (!props.topActivity) {
    return null;
  }

  return (
    <KangurActivitySummaryCard
      activity={props.topActivity}
      dataTestId='player-progress-top-activity'
      description={props.translations('topActivityDescription', {
        sessions: props.topActivity.sessionsPlayed,
        xp: props.topActivity.averageXpPerSession,
      })}
      eyebrow={props.translations('topActivityEyebrow')}
    />
  );
}

function PlayerProgressNextBadgeSection(props: {
  nextBadge: ReturnType<typeof getNextLockedBadge>;
  translations: ReturnType<typeof useTranslations<'KangurPlayerProgress'>>;
}): React.JSX.Element | null {
  if (!props.nextBadge) {
    return null;
  }

  return (
    <div
      className='rounded-[28px] border border-amber-200/80 px-4 py-4'
      data-testid='player-progress-next-badge'
      style={{
        background: 'color-mix(in srgb, var(--kangur-soft-card-background) 82%, #fde68a)',
      }}
    >
      <KangurProgressHighlightCardContent>
        <KangurPanelRow className='items-start sm:justify-between'>
          <KangurProgressHighlightHeader
            description={props.nextBadge.desc}
            eyebrow={props.translations('nextBadgeEyebrow')}
            eyebrowClassName='text-amber-700/80'
            title={
              <>
                {props.nextBadge.emoji} {props.nextBadge.name}
              </>
            }
          />
          <KangurProgressHighlightChip accent='amber' label={props.nextBadge.summary} />
        </KangurPanelRow>
        <KangurProgressHighlightBar
          accent='amber'
          testId='player-progress-next-badge-bar'
          value={props.nextBadge.progressPercent}
        />
      </KangurProgressHighlightCardContent>
    </div>
  );
}

function PlayerProgressGuidedMomentumSection(props: {
  guidedMomentum: ReturnType<typeof getRecommendedSessionMomentum>;
  translations: ReturnType<typeof useTranslations<'KangurPlayerProgress'>>;
}): React.JSX.Element | null {
  if (props.guidedMomentum.completedSessions <= 0) {
    return null;
  }

  return (
    <div
      className='rounded-[28px] border border-sky-200/80 px-4 py-4'
      data-testid='player-progress-guided-momentum'
      style={{
        background: 'color-mix(in srgb, var(--kangur-soft-card-background) 82%, #dbeafe)',
      }}
    >
      <KangurProgressHighlightCardContent>
        <KangurPanelRow className='items-start sm:justify-between'>
          <KangurProgressHighlightHeader
            description={
              props.guidedMomentum.nextBadgeName
                ? props.translations('guidedMomentumDescriptionWithBadge', {
                    badge: props.guidedMomentum.nextBadgeName,
                    summary: props.guidedMomentum.summary,
                  })
                : props.translations('guidedMomentumDescriptionUnlocked')
            }
            eyebrow={props.translations('guidedMomentumEyebrow')}
            eyebrowClassName='text-sky-700/80'
            title={props.translations('guidedMomentumTitle', {
              count: props.guidedMomentum.completedSessions,
            })}
          />
          <KangurProgressHighlightChip accent='sky' label={props.guidedMomentum.summary} />
        </KangurPanelRow>
        <KangurProgressHighlightBar
          accent='sky'
          testId='player-progress-guided-momentum-bar'
          value={props.guidedMomentum.progressPercent}
        />
      </KangurProgressHighlightCardContent>
    </div>
  );
}

export default function PlayerProgressCard({
  progress,
}: PlayerProgressCardProps): React.JSX.Element {
  const translations = useTranslations('KangurPlayerProgress');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { entry: progressContent } = useKangurPageContentEntry('game-home-progress');
  const badgeTrackProgress = progress;
  const { totalXp, gamesPlayed, lessonsCompleted } = progress;
  const progressLocalizer = { translate: runtimeTranslations };
  const currentLevel = getCurrentLevel(totalXp, progressLocalizer);
  const nextLevel = getNextLevel(totalXp, progressLocalizer);
  const xpIntoLevel = totalXp - currentLevel.minXp;
  const xpNeeded = nextLevel ? nextLevel.minXp - currentLevel.minXp : 1;
  const percent = nextLevel ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100;
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const averageXpPerSession = getProgressAverageXpPerSession(progress);
  const bestWinStreak = progress.bestWinStreak ?? 0;
  const topActivity = getProgressTopActivities(progress, 1, progressLocalizer)[0] ?? null;
  const nextBadge = getNextLockedBadge(progress, progressLocalizer);
  const guidedMomentum = getRecommendedSessionMomentum(progress, progressLocalizer);
  const { progressSummary, progressTitle } = resolvePlayerProgressSummary(
    progressContent,
    translations
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='w-full max-w-sm'
    >
      <KangurGlassPanel
        className={GAME_HOME_PLAYER_PROGRESS_SHELL_CLASSNAME}
        data-testid='player-progress-shell'
        padding='lg'
        surface='solid'
        variant='soft'
      >
        <div className='space-y-2' data-testid='player-progress-copy'>
          <KangurSectionEyebrow as='p' className='tracking-[0.18em]'>
            {progressTitle}
          </KangurSectionEyebrow>
          <KangurCardDescription as='p' size='xs'>
            {progressSummary}
          </KangurCardDescription>
        </div>

        <div className='flex items-start kangur-panel-gap sm:items-center'>
          <KangurDisplayEmoji size='sm'>🎖️</KangurDisplayEmoji>
          <div className='min-w-0 flex-1'>
            <KangurCardTitle as='p' className={currentLevel.color} size='lg'>
              {currentLevel.title}
            </KangurCardTitle>
            <KangurMetaText as='p' size='xs'>
              {translations('totalXpLine', { level: currentLevel.level, xp: totalXp })}
            </KangurMetaText>
          </div>
        </div>

        <div>
          <PlayerProgressLevelMeta
            nextLevel={nextLevel}
            translations={translations}
            xpIntoLevel={xpIntoLevel}
            xpNeeded={xpNeeded}
          />
          <KangurProgressBar
            accent='indigo'
            animated
            data-testid='player-progress-level-bar'
            size='md'
            value={percent}
          />
        </div>

        <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
          <KangurMetricCard
            accent='indigo'
            align='center'
            label={translations('metrics.games')}
            value={gamesPlayed}
          />
          <KangurMetricCard
            accent='violet'
            align='center'
            label={translations('metrics.lessons')}
            value={lessonsCompleted}
          />
          <KangurMetricCard
            accent='emerald'
            align='center'
            label={translations('metrics.accuracy')}
            value={`${averageAccuracy}%`}
          />
          <KangurMetricCard
            accent='amber'
            align='center'
            label={translations('metrics.streak')}
            value={bestWinStreak}
          />
          <KangurMetricCard
            accent='sky'
            align='center'
            label={translations('metrics.xpPerGame')}
            value={averageXpPerSession}
          />
        </div>

        <PlayerProgressTopActivitySection topActivity={topActivity} translations={translations} />
        <PlayerProgressNextBadgeSection nextBadge={nextBadge} translations={translations} />
        <PlayerProgressGuidedMomentumSection
          guidedMomentum={guidedMomentum}
          translations={translations}
        />

        <KangurBadgeTrackSection
          dataTestIdPrefix='player-progress-badge-track'
          emptyTestId='player-progress-badges-empty'
          headingClassName='mb-2 text-xs tracking-wide'
          progress={badgeTrackProgress}
        />
      </KangurGlassPanel>
    </motion.div>
  );
}
