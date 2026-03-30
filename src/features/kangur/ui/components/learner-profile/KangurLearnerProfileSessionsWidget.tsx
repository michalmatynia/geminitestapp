'use client';

import { useLocale, useTranslations } from 'next-intl';
import { KangurBadgeTrackSection } from '@/features/kangur/ui/components/badge-track/KangurBadgeTrackSection';
import { KangurPanelSectionHeading } from '@/features/kangur/ui/components/KangurPanelSectionHeading';
import { KangurSessionHistoryRow } from '@/features/kangur/ui/components/KangurSessionHistoryRow';
import {
  formatKangurProfileDateTime,
  formatKangurProfileDuration,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurPanelIntro,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { translateKangurLearnerProfileWithFallback } from '@/features/kangur/ui/services/profile';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const SESSION_ACCENTS: Record<string, KangurAccent> = {
  addition: 'amber',
  subtraction: 'rose',
  multiplication: 'violet',
  division: 'sky',
  mixed: 'indigo',
  clock: 'indigo',
  calendar: 'emerald',
  geometry: 'teal',
};

const resolveSessionAccent = (operation: string): KangurAccent =>
  SESSION_ACCENTS[operation] ?? 'indigo';

const resolveSessionScoreAccent = (accuracyPercent: number): KangurAccent => {
  if (accuracyPercent >= 90) {
    return 'emerald';
  }
  if (accuracyPercent >= 70) {
    return 'amber';
  }
  return 'rose';
};

const getDateMissingFallbackLabel = (locale: ReturnType<typeof normalizeSiteLocale>): string => {
  if (locale === 'uk') {
    return 'Немає дати';
  }

  if (locale === 'de') {
    return 'Kein Datum';
  }

  if (locale === 'en') {
    return 'No date';
  }

  return 'Brak daty';
};

export function KangurLearnerProfileSessionsWidget(): React.JSX.Element {
  const locale = normalizeSiteLocale(useLocale());
  const translations = useTranslations('KangurLearnerProfileWidgets.sessions');
  const runtimeTranslations = useTranslations('KangurLearnerProfileRuntime');
  const { isLoadingScores, progress, scoresError, snapshot } = useKangurLearnerProfileRuntime();
  const { entry: sessionsContent } = useKangurPageContentEntry('learner-profile-sessions');
  const sectionTitle = sessionsContent?.title ?? translations('title');
  const sectionSummary =
    sessionsContent?.summary ??
    translations('summary');
  const dateMissingLabel = translateKangurLearnerProfileWithFallback(
    (key, values) => runtimeTranslations(key as never, values as never),
    'dateMissing',
    getDateMissingFallbackLabel(locale)
  );

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-sessions-intro'
        description={sectionSummary}
        eyebrow={sectionTitle}
      />
      <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <KangurGlassPanel padding='lg' surface='mistStrong' variant='soft'>
          <KangurPanelSectionHeading>{translations('recentSessionsHeading')}</KangurPanelSectionHeading>
          {isLoadingScores ? (
            <KangurEmptyState
              accent='slate'
              align='center'
              data-testid='learner-profile-sessions-loading'
              description={translations('loadingDescription')}
              title={translations('loadingTitle')}
            />
          ) : scoresError ? (
            <KangurEmptyState
              accent='rose'
              align='center'
              data-testid='learner-profile-sessions-error'
              description={translations('errorDescription')}
              title={scoresError}
            />
          ) : snapshot.recentSessions.length === 0 ? (
            <KangurEmptyState
              accent='slate'
              align='center'
              data-testid='learner-profile-sessions-empty'
              description={translations('emptyDescription')}
              title={translations('emptyTitle')}
            />
          ) : (
            <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
              {snapshot.recentSessions.map((session) => {
                const sessionAccent = resolveSessionAccent(session.operation);
                return (
                  <KangurSessionHistoryRow
                    accent={sessionAccent}
                    dataTestId={`learner-profile-session-${session.id}`}
                    durationText={formatKangurProfileDuration(session.timeTakenSeconds)}
                    icon={session.operationEmoji}
                    iconTestId={`learner-profile-session-icon-${session.id}`}
                    key={session.id}
                    scoreAccent={resolveSessionScoreAccent(session.accuracyPercent)}
                    scoreTestId={`learner-profile-session-score-${session.id}`}
                    scoreText={`${session.score}/${session.totalQuestions}`}
                    subtitle={formatKangurProfileDateTime(session.createdAt, {
                      locale,
                      dateMissingLabel,
                    })}
                    title={session.operationLabel}
                    titleClassName='text-sm font-semibold'
                    xpTestId={`learner-profile-session-xp-${session.id}`}
                    xpText={session.xpEarned !== null ? `+${session.xpEarned} XP` : undefined}
                  />
                );
              })}
            </div>
          )}
        </KangurGlassPanel>

        <KangurGlassPanel padding='lg' surface='solid' variant='subtle'>
          <KangurBadgeTrackSection
            dataTestIdPrefix='learner-profile-badge-track'
            emptyTestId='learner-profile-badges-empty'
            gridClassName='grid-cols-1 md:grid-cols-1'
            heading={translations('badgeTracksHeading')}
            progress={progress}
          />
        </KangurGlassPanel>
      </div>
    </section>
  );
}
