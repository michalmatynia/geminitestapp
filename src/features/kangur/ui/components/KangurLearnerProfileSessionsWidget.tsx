'use client';

import {
  formatKangurProfileDateTime,
  formatKangurProfileDuration,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurIconBadge,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { getProgressBadges } from '@/features/kangur/ui/services/progress';
import { cn } from '@/shared/utils';

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
  const { isLoadingScores, progress, scoresError, snapshot } = useKangurLearnerProfileRuntime();
  const badgeStatuses = getProgressBadges(progress);

  return (
    <section className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
      <KangurGlassPanel
        className='xl:col-span-3'
        padding='lg'
        surface='mistStrong'
        variant='soft'
      >
        <div className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
          Ostatnie sesje
        </div>
        {isLoadingScores ? (
          <KangurEmptyState
            accent='slate'
            align='center'
            data-testid='learner-profile-sessions-loading'
            description='Sprawdzamy ostatnie podejscia ucznia.'
            title='Ladowanie historii...'
          />
        ) : scoresError ? (
          <KangurEmptyState
            accent='rose'
            align='center'
            data-testid='learner-profile-sessions-error'
            description='Sprobuj odswiezyc profil za chwile.'
            title={scoresError}
          />
        ) : snapshot.recentSessions.length === 0 ? (
          <KangurEmptyState
            accent='slate'
            align='center'
            data-testid='learner-profile-sessions-empty'
            description='Pierwsze sesje pojawia sie tutaj automatycznie.'
            title='Brak rozegranych sesji.'
          />
        ) : (
          <div className='flex flex-col gap-2'>
            {snapshot.recentSessions.map((session) => {
              const sessionAccent = resolveSessionAccent(session.operation);
              return (
                <KangurInfoCard
                  accent={sessionAccent}
                  className='flex items-center gap-3'
                  data-testid={`learner-profile-session-${session.id}`}
                  key={session.id}
                  padding='sm'
                  tone='accent'
                >
                  <KangurIconBadge
                    accent={sessionAccent}
                    data-testid={`learner-profile-session-icon-${session.id}`}
                    size='sm'
                  >
                    <span aria-hidden='true'>{session.operationEmoji}</span>
                  </KangurIconBadge>
                  <div className='flex-1'>
                    <div className='text-sm font-semibold text-slate-700'>{session.operationLabel}</div>
                    <div className='text-xs text-slate-500'>
                      {formatKangurProfileDateTime(session.createdAt)}
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-1 text-right'>
                    <KangurStatusChip
                      accent={resolveSessionScoreAccent(session.accuracyPercent)}
                      data-testid={`learner-profile-session-score-${session.id}`}
                      size='sm'
                    >
                      {session.score}/{session.totalQuestions}
                    </KangurStatusChip>
                    {session.xpEarned !== null ? (
                      <KangurStatusChip
                        accent='indigo'
                        data-testid={`learner-profile-session-xp-${session.id}`}
                        size='sm'
                      >
                        +{session.xpEarned} XP
                      </KangurStatusChip>
                    ) : null}
                    <div className='text-xs text-slate-500'>
                      {formatKangurProfileDuration(session.timeTakenSeconds)}
                    </div>
                  </div>
                </KangurInfoCard>
              );
            })}
          </div>
        )}
      </KangurGlassPanel>

      <KangurGlassPanel className='xl:col-span-2' padding='lg' surface='solid' variant='subtle'>
        <div className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
          Odznaki
        </div>
        <div className='flex flex-wrap gap-2'>
          {badgeStatuses.map((badge) => {
            const unlocked = badge.isUnlocked;
            return (
              <KangurStatusChip
                accent={unlocked ? 'indigo' : 'slate'}
                className={cn('gap-1.5', !unlocked && 'opacity-70')}
                data-testid={`learner-profile-badge-${badge.id}`}
                key={badge.id}
                size='sm'
                title={`${badge.name}: ${badge.desc}${unlocked ? '' : ` (${badge.summary})`}`}
              >
                <span className={unlocked ? '' : 'grayscale'}>{badge.emoji}</span>
                <span>{badge.name}</span>
                {!unlocked ? (
                  <span className='text-[11px] font-semibold text-slate-500'>{badge.summary}</span>
                ) : null}
              </KangurStatusChip>
            );
          })}
        </div>
      </KangurGlassPanel>
    </section>
  );
}
