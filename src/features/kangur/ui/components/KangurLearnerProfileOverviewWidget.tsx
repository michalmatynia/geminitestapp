'use client';

import { Award, BarChart2, Compass, Flame, Sparkles, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { KANGUR_AVATAR_OPTIONS, getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { useKangurAuthActions } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurGlassPanel,
  KangurMetricCard,
  KangurMetaText,
  KangurPanelIntro,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_CENTER_ROW_RELAXED_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_INLINE_CENTER_ROW_CLASSNAME,
  KANGUR_RELAXED_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import type { KangurDailyQuestState } from '@/features/kangur/shared/contracts/kangur-quests';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import { getNextLockedBadge } from '@/features/kangur/ui/services/progress';
import { withKangurClientError } from '@/features/kangur/observability/client';

const kangurPlatform = getKangurPlatform();

export function KangurLearnerProfileOverviewWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.overview');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { progress, snapshot, user } = useKangurLearnerProfileRuntime();
  const { checkAppState } = useKangurAuthActions();
  const { subject, subjectKey } = useKangurSubjectFocus();
  const { entry: overviewContent } = useKangurPageContentEntry('learner-profile-overview');
  const nextBadge = getNextLockedBadge(progress, { translate: runtimeTranslations });
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const isCoarsePointer = useKangurCoarsePointer();
  const activeLearner = user?.activeLearner ?? null;
  const selectedAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const dailyQuest = useMemo<KangurDailyQuestState | null | undefined>(
    () =>
      getCurrentKangurDailyQuest(progress, {
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      }),
    [progress, runtimeTranslations, subject, subjectKey]
  );

  const dailyQuestAccent =
    dailyQuest?.reward.status === 'claimed'
      ? 'emerald'
      : dailyQuest?.progress.status === 'completed'
        ? 'amber'
        : dailyQuest?.progress.status === 'in_progress'
          ? 'indigo'
          : 'slate';

  const handleAvatarSelect = async (avatarId: string): Promise<void> => {
    if (!activeLearner || isSavingAvatar) {
      return;
    }
    if (activeLearner.avatarId === avatarId) {
      return;
    }
    setIsSavingAvatar(true);
    setAvatarError(null);
    await withKangurClientError(
      {
        source: 'kangur-learner-profile',
        action: 'update-avatar',
        description: 'Update learner avatar selection.',
        context: {
          learnerId: activeLearner.id,
          avatarId,
        },
      },
      async () => {
        await kangurPlatform.learners.update(activeLearner.id, { avatarId });
        await checkAppState();
      },
      {
        fallback: undefined,
        onError: () => {
          setAvatarError(translations('avatarSaveError'));
        },
      }
    );
    setIsSavingAvatar(false);
  };

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-overview-intro'
        description={
          overviewContent?.summary ??
          translations('summary')
        }
        eyebrow={overviewContent?.title ?? translations('title')}
      />
      <KangurGlassPanel
        className='flex w-full flex-col gap-4'
        padding='lg'
        surface='mist'
      >
        <div className={`${KANGUR_RELAXED_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
          <div className={KANGUR_CENTER_ROW_RELAXED_CLASSNAME}>
            <div className='h-16 w-16 overflow-hidden rounded-full border border-white/80 bg-white/80 shadow-sm'>
              {selectedAvatar ? (
                <img
                  src={selectedAvatar.src}
                  alt={selectedAvatar.label}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center text-xl font-black text-slate-400'>
                  ?
                </div>
              )}
            </div>
            <div>
              <h3 className='text-base font-bold text-slate-800'>{translations('avatarTitle')}</h3>
              <KangurMetaText className='mt-1'>
                {translations('avatarDescription')}
              </KangurMetaText>
            </div>
          </div>
          {avatarError ? (
            <KangurMetaText className='text-rose-600'>{avatarError}</KangurMetaText>
          ) : null}
        </div>
        <div
          className='grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 min-[420px]:grid-cols-4 sm:grid-cols-5'
          role='radiogroup'
          aria-label={translations('avatarGroupLabel')}
        >
          {KANGUR_AVATAR_OPTIONS.map((option) => {
            const isSelected = activeLearner?.avatarId === option.id;
            return (
              <button
                key={option.id}
                type='button'
                role='radio'
                aria-checked={isSelected}
                aria-label={option.label}
                disabled={!activeLearner || isSavingAvatar}
                onClick={() => {
                  void handleAvatarSelect(option.id);
                }}
                className={`relative overflow-hidden rounded-full border transition touch-manipulation select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white ${
                  isCoarsePointer ? 'h-12 w-12 sm:h-14 sm:w-14' : 'h-11 w-11 sm:h-12 sm:w-12'
                } ${
                  isSelected
                    ? 'border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]'
                    : 'border-white/80 hover:border-amber-200'
                } ${!activeLearner || isSavingAvatar ? 'opacity-60' : 'cursor-pointer'}`}
              >
                <img
                  src={option.src}
                  alt={option.label}
                  className='h-full w-full object-cover'
                />
              </button>
            );
          })}
        </div>
      </KangurGlassPanel>
      <div
        className={`grid grid-cols-1 ${KANGUR_PANEL_GAP_CLASSNAME} min-[420px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6`}
      >
      <KangurMetricCard
        accent='indigo'
        data-testid='learner-profile-overview-average-accuracy'
        description={translations('averageAccuracyDescription', { value: snapshot.bestAccuracy })}
        label={
          <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
            <BarChart2 aria-hidden='true' className='h-4 w-4' /> {translations('averageAccuracyLabel')}
          </span>
        }
        value={`${snapshot.averageAccuracy}%`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-streak'
        description={translations('streakDescription', { value: snapshot.longestStreakDays })}
        label={
          <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
            <Flame aria-hidden='true' className='h-4 w-4' /> {translations('streakLabel')}
          </span>
        }
        value={snapshot.currentStreakDays}
      />

      <KangurMetricCard
        accent='violet'
        data-testid='learner-profile-overview-xp-today'
        description={translations('xpTodayDescription', {
          weeklyXp: snapshot.weeklyXpEarned,
          averageXp: snapshot.averageXpPerSession,
        })}
        label={
          <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
            <Sparkles aria-hidden='true' className='h-4 w-4' /> {translations('xpTodayLabel')}
          </span>
        }
        value={`+${snapshot.todayXpEarned}`}
      />

      {snapshot.recommendedSessionsCompleted > 0 ? (
        <KangurMetricCard
          accent='sky'
          data-testid='learner-profile-overview-guided-rounds'
          description={
            snapshot.recommendedSessionNextBadgeName
              ? translations('guidedRoundsDescription', {
                badge: snapshot.recommendedSessionNextBadgeName,
                summary: snapshot.recommendedSessionSummary,
              })
              : translations('guidedRoundsUnlocked')
          }
          label={
            <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
              <Compass aria-hidden='true' className='h-4 w-4' /> {translations('guidedRoundsLabel')}
            </span>
          }
          value={snapshot.recommendedSessionsCompleted}
          valueClassName='text-2xl sm:text-3xl'
        >
          <div className='space-y-2 pt-1'>
            <p className='text-xs font-semibold [color:var(--kangur-page-text)]'>
              {snapshot.recommendedSessionSummary}
            </p>
            <KangurProgressBar
              accent='sky'
              data-testid='learner-profile-overview-guided-rounds-bar'
              size='sm'
              value={snapshot.recommendedSessionProgressPercent}
            />
          </div>
        </KangurMetricCard>
      ) : null}

      <KangurMetricCard
        accent={dailyQuestAccent}
        data-testid='learner-profile-overview-daily-quest'
        description={
          dailyQuest
            ? `${dailyQuest.progress.summary} · ${dailyQuest.reward.label}`
            : dailyQuest === null
              ? translations('dailyQuestMissing')
              : translations('dailyQuestLoading')
        }
        label={
          <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
            <Target aria-hidden='true' className='h-4 w-4' /> {translations('dailyQuestLabel')}
          </span>
        }
        value={dailyQuest ? `${dailyQuest.progress.percent}%` : dailyQuest === null ? '—' : '...'}
        valueClassName='text-2xl sm:text-3xl'
      >
        {dailyQuest ? (
          <div className='space-y-2 pt-1'>
            <p className='text-xs font-semibold [color:var(--kangur-page-text)]'>
              {dailyQuest.assignment.title}
            </p>
            <KangurProgressBar
              accent={dailyQuest.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent}
              data-testid='learner-profile-overview-daily-quest-bar'
              size='sm'
              value={dailyQuest.progress.percent}
            />
          </div>
        ) : null}
      </KangurMetricCard>

      <KangurMetricCard
        accent='teal'
        data-testid='learner-profile-overview-daily-goal'
        description={translations('dailyGoalDescription', { value: snapshot.dailyGoalPercent })}
        label={
          <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
            <Target aria-hidden='true' className='h-4 w-4' /> {translations('dailyGoalLabel')}
          </span>
        }
        value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-badges'
        description={
          nextBadge
            ? translations('badgesDescription', {
              badge: nextBadge.name,
              summary: nextBadge.summary,
            })
            : translations('badgesUnlocked')
        }
        label={
          <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
            <Award aria-hidden='true' className='h-4 w-4' /> {translations('badgesLabel')}
          </span>
        }
        value={`${snapshot.unlockedBadges}/${snapshot.totalBadges}`}
      />
      </div>
    </section>
  );
}
