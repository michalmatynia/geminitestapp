'use client';

import { Award, BarChart2, Compass, Flame, Sparkles, Target } from 'lucide-react';
import { useEffect, useState } from 'react';

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
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import type { KangurDailyQuestState } from '@/features/kangur/shared/contracts/kangur-quests';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import { getNextLockedBadge } from '@/features/kangur/ui/services/progress';
import { withKangurClientError } from '@/features/kangur/observability/client';

const kangurPlatform = getKangurPlatform();

export function KangurLearnerProfileOverviewWidget(): React.JSX.Element {
  const { progress, snapshot, user } = useKangurLearnerProfileRuntime();
  const { checkAppState } = useKangurAuthActions();
  const { subject } = useKangurSubjectFocus();
  const { entry: overviewContent } = useKangurPageContentEntry('learner-profile-overview');
  const nextBadge = getNextLockedBadge(progress);
  const [dailyQuest, setDailyQuest] = useState<KangurDailyQuestState | null | undefined>(undefined);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const activeLearner = user?.activeLearner ?? null;
  const selectedAvatar = getKangurAvatarById(activeLearner?.avatarId);

  useEffect(() => {
    setDailyQuest(getCurrentKangurDailyQuest(progress, { subject }));
  }, [progress, subject]);

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
          setAvatarError('Nie udalo sie zapisac avatara.');
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
          'Najważniejsze wskaźniki dnia: skuteczność, misja, cel i odznaki w jednym widoku.'
        }
        eyebrow={overviewContent?.title ?? 'Przegląd wyników'}
      />
      <KangurGlassPanel
        className='flex w-full flex-col gap-4'
        padding='lg'
        surface='mist'
      >
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-4'>
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
              <h3 className='text-base font-bold text-slate-800'>Avatar ucznia</h3>
              <KangurMetaText className='mt-1'>
                Wybierz bohatera, ktory bedzie widoczny w profilu ucznia.
              </KangurMetaText>
            </div>
          </div>
          {avatarError ? (
            <KangurMetaText className='text-rose-600'>{avatarError}</KangurMetaText>
          ) : null}
        </div>
        <div
          className='grid grid-cols-5 gap-3 sm:grid-cols-8'
          role='radiogroup'
          aria-label='Wybierz avatar'
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
                className={`relative h-12 w-12 overflow-hidden rounded-full border transition ${
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
        className={`grid grid-cols-1 ${KANGUR_PANEL_GAP_CLASSNAME} min-[360px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6`}
      >
      <KangurMetricCard
        accent='indigo'
        data-testid='learner-profile-overview-average-accuracy'
        description={`Najlepsza sesja: ${snapshot.bestAccuracy}%`}
        label={
          <span className='inline-flex items-center gap-2'>
            <BarChart2 className='h-4 w-4' /> Średnia skuteczność
          </span>
        }
        value={`${snapshot.averageAccuracy}%`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-streak'
        description={`Najdłuższa: ${snapshot.longestStreakDays} dni`}
        label={
          <span className='inline-flex items-center gap-2'>
            <Flame className='h-4 w-4' /> Seria dni
          </span>
        }
        value={snapshot.currentStreakDays}
      />

      <KangurMetricCard
        accent='violet'
        data-testid='learner-profile-overview-xp-today'
        description={`7 dni: +${snapshot.weeklyXpEarned} XP · średnio ${snapshot.averageXpPerSession} XP na sesję`}
        label={
          <span className='inline-flex items-center gap-2'>
            <Sparkles className='h-4 w-4' /> XP dzisiaj
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
              ? `Do odznaki: ${snapshot.recommendedSessionNextBadgeName} · ${snapshot.recommendedSessionSummary}`
              : 'Wszystkie odznaki polecanego kierunku odblokowane.'
          }
          label={
            <span className='inline-flex items-center gap-2'>
              <Compass className='h-4 w-4' /> Polecone rundy
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
              ? 'Nowa misja pojawi się wraz z postępem.'
              : 'Trwa ładowanie misji dnia...'
        }
        label={
          <span className='inline-flex items-center gap-2'>
            <Target className='h-4 w-4' /> Misja dnia
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
        description={`Wypełnienie: ${snapshot.dailyGoalPercent}%`}
        label={
          <span className='inline-flex items-center gap-2'>
            <Target className='h-4 w-4' /> Cel dzienny
          </span>
        }
        value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-badges'
        description={
          nextBadge
            ? `Następna: ${nextBadge.name} · ${nextBadge.summary}`
            : 'Wszystkie odznaki odblokowane'
        }
        label={
          <span className='inline-flex items-center gap-2'>
            <Award className='h-4 w-4' /> Odznaki
          </span>
        }
        value={`${snapshot.unlockedBadges}/${snapshot.totalBadges}`}
      />
      </div>
    </section>
  );
}
