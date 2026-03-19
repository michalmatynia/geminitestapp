import { useTranslations } from 'next-intl';
import { KangurBadgeTrackSection } from '@/features/kangur/ui/components/KangurBadgeTrackSection';
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

export function KangurLearnerProfileSessionsWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.sessions');
  const { isLoadingScores, progress, scoresError, snapshot } = useKangurLearnerProfileRuntime();
  const { entry: sessionsContent } = useKangurPageContentEntry('learner-profile-sessions');
  const sectionTitle = sessionsContent?.title ?? translations('title');
  const sectionSummary =
    sessionsContent?.summary ??
    translations('summary');

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-sessions-intro'
        description={sectionSummary}
        eyebrow={sectionTitle}
      />
      <div className={`grid grid-cols-1 ${KANGUR_PANEL_GAP_CLASSNAME} xl:grid-cols-5`}>
        <KangurGlassPanel
          className='xl:col-span-3'
          padding='lg'
          surface='mistStrong'
          variant='soft'
        >
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
                    subtitle={formatKangurProfileDateTime(session.createdAt)}
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

        <KangurGlassPanel className='xl:col-span-2' padding='lg' surface='solid' variant='subtle'>
          <KangurBadgeTrackSection
            dataTestIdPrefix='learner-profile-badge-track'
            emptyTestId='learner-profile-badges-empty'
            gridClassName='grid-cols-1'
            heading={translations('badgeTracksHeading')}
            progress={progress}
          />
        </KangurGlassPanel>
      </div>
    </section>
  );
}
