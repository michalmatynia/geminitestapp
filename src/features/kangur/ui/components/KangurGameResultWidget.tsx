'use client';

import KangurGameHomeMomentumWidget from '@/features/kangur/ui/components/KangurGameHomeMomentumWidget';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import ResultScreen from '@/features/kangur/ui/components/ResultScreen';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import { BADGES, getNextLockedBadge } from '@/features/kangur/ui/services/progress';

export function KangurGameResultWidget(): React.JSX.Element | null {
  const {
    activeSessionRecommendation,
    basePath,
    handleHome,
    handleRestart,
    operation,
    playerName,
    progress,
    resultPracticeAssignment,
    score,
    screen,
    timeTaken,
    totalQuestions,
    xpToast,
  } = useKangurGameRuntime();

  if (screen !== 'result') {
    return null;
  }

  const currentQuest = getCurrentKangurDailyQuest(progress);
  const nextBadge = getNextLockedBadge(progress);
  const unlockedBadgeDetails = (xpToast.newBadges ?? [])
    .map((badgeId) => BADGES.find((badge) => badge.id === badgeId))
    .filter((badge): badge is (typeof BADGES)[number] => Boolean(badge));

  return (
    <div className='flex w-full flex-col items-center gap-6'>
      {resultPracticeAssignment ? (
        <div className='flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={resultPracticeAssignment}
            basePath={basePath}
            mode={resultPracticeAssignment.progress.status === 'completed' ? 'completed' : 'active'}
          />
        </div>
      ) : null}
      <ResultScreen
        score={score}
        total={totalQuestions}
        playerName={playerName}
        operation={operation}
        timeTaken={timeTaken}
        onRestart={handleRestart}
        onHome={handleHome}
      />

      {xpToast.xpGained > 0 ? (
        <KangurInfoCard
          accent='indigo'
          className='w-full max-w-2xl rounded-[28px]'
          data-testid='kangur-result-reward-card'
          padding='md'
          tone='accent'
        >
          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap gap-2'>
              <KangurStatusChip
                accent='indigo'
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-result-reward-chip'
                size='sm'
              >
                Nagroda za runde
              </KangurStatusChip>
              <KangurStatusChip
                accent='violet'
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-result-reward-total'
                size='sm'
              >
                +{xpToast.xpGained} XP
              </KangurStatusChip>
            </div>

            <div
              className='text-sm font-semibold text-slate-900'
              data-testid='kangur-result-reward-title'
            >
              {xpToast.recommendation
                ? 'Ta runda trafila w polecany kierunek i przesunela postep do przodu.'
                : 'Ta runda przesunela postep do przodu.'}
            </div>

            <KangurRewardBreakdownChips
              accent='slate'
              breakdown={xpToast.breakdown}
              className='gap-2'
              dataTestId='kangur-result-reward-breakdown'
              itemDataTestIdPrefix='kangur-result-reward-breakdown'
            />

            {xpToast.nextBadge ? (
              <div
                className='text-xs leading-6 text-slate-700'
                data-testid='kangur-result-reward-next-badge'
              >
                Nastepna odznaka: {xpToast.nextBadge.emoji} {xpToast.nextBadge.name} ·{' '}
                {xpToast.nextBadge.summary}
              </div>
            ) : null}
            {xpToast.recommendation ? (
              <div
                className='text-xs leading-6 text-violet-700'
                data-testid='kangur-result-reward-recommendation'
              >
                Polecony kierunek: {xpToast.recommendation.title} ·{' '}
                {xpToast.recommendation.summary}
              </div>
            ) : null}
          </div>
        </KangurInfoCard>
      ) : null}

      {activeSessionRecommendation ? (
        <KangurInfoCard
          accent='violet'
          className='w-full max-w-2xl rounded-[28px]'
          data-testid='kangur-result-recommendation-card'
          padding='md'
          tone='accent'
        >
          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap gap-2'>
              <KangurStatusChip
                accent='violet'
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-result-recommendation-chip'
                size='sm'
              >
                Zagrano zgodnie z rekomendacja
              </KangurStatusChip>
              <KangurStatusChip
                accent='indigo'
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-result-recommendation-label'
                size='sm'
              >
                {activeSessionRecommendation.label}
              </KangurStatusChip>
            </div>
            <div
              className='text-sm font-semibold text-slate-900'
              data-testid='kangur-result-recommendation-title'
            >
              {activeSessionRecommendation.title}
            </div>
            {activeSessionRecommendation.description ? (
              <div
                className='text-xs leading-6 text-slate-700'
                data-testid='kangur-result-recommendation-description'
              >
                {activeSessionRecommendation.description}
              </div>
            ) : null}
          </div>
        </KangurInfoCard>
      ) : null}

      {unlockedBadgeDetails.length > 0 ? (
        <KangurInfoCard
          accent='amber'
          className='w-full max-w-2xl rounded-[28px]'
          data-testid='kangur-result-badges-card'
          padding='md'
          tone='accent'
        >
          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap gap-2'>
              <KangurStatusChip
                accent='amber'
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-result-badges-chip'
                size='sm'
              >
                Nowe odznaki
              </KangurStatusChip>
              <KangurStatusChip
                accent='violet'
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-result-badges-count'
                size='sm'
              >
                {unlockedBadgeDetails.length}
              </KangurStatusChip>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              {unlockedBadgeDetails.map((badge) => (
                <div
                  className='rounded-[22px] border border-amber-200/80 bg-white/78 px-4 py-3 text-left'
                  data-testid={`kangur-result-badge-${badge.id}`}
                  key={badge.id}
                >
                  <div className='text-sm font-semibold text-slate-900'>
                    {badge.emoji} {badge.name}
                  </div>
                  <div className='mt-1 text-xs leading-6 text-slate-600'>{badge.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </KangurInfoCard>
      ) : null}

      {xpToast.dailyQuest || nextBadge ? (
        <KangurInfoCard
          accent={xpToast.dailyQuest ? 'emerald' : 'amber'}
          className='w-full max-w-2xl rounded-[28px]'
          data-testid='kangur-result-followup-card'
          padding='md'
          tone='accent'
        >
          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap gap-2'>
              {xpToast.dailyQuest ? (
                <>
                  <KangurStatusChip
                    accent='emerald'
                    className='text-[11px] uppercase tracking-[0.16em]'
                    data-testid='kangur-result-followup-quest-chip'
                    size='sm'
                  >
                    Misja dnia ukonczona
                  </KangurStatusChip>
                  {xpToast.dailyQuest.xpAwarded > 0 ? (
                    <KangurStatusChip
                      accent='amber'
                      className='text-[11px] uppercase tracking-[0.16em]'
                      data-testid='kangur-result-followup-quest-reward-chip'
                      size='sm'
                    >
                      Bonus +{xpToast.dailyQuest.xpAwarded} XP
                    </KangurStatusChip>
                  ) : null}
                </>
              ) : null}

              {nextBadge ? (
                <KangurStatusChip
                  accent='amber'
                  className='text-[11px] uppercase tracking-[0.16em]'
                  data-testid='kangur-result-followup-badge-chip'
                  size='sm'
                >
                  Nastepna odznaka
                </KangurStatusChip>
              ) : null}

              {currentQuest ? (
                <KangurStatusChip
                  accent={
                    currentQuest.reward.status === 'claimed'
                      ? 'emerald'
                      : currentQuest.reward.status === 'ready'
                        ? 'amber'
                        : 'indigo'
                  }
                  className='text-[11px] uppercase tracking-[0.16em]'
                  data-testid='kangur-result-followup-quest-status-chip'
                  size='sm'
                >
                  {currentQuest.reward.label}
                </KangurStatusChip>
              ) : null}
            </div>

            {xpToast.dailyQuest ? (
              <>
                <div
                  className='text-sm font-semibold text-slate-900'
                  data-testid='kangur-result-followup-title'
                >
                  {xpToast.dailyQuest.title}
                </div>
                <div
                  className='text-xs leading-6 text-slate-700'
                  data-testid='kangur-result-followup-description'
                >
                  {xpToast.dailyQuest.summary}
                </div>
              </>
            ) : nextBadge ? (
              <>
                <div
                  className='text-sm font-semibold text-slate-900'
                  data-testid='kangur-result-followup-title'
                >
                  {nextBadge.emoji} {nextBadge.name}
                </div>
                <div
                  className='text-xs leading-6 text-slate-700'
                  data-testid='kangur-result-followup-description'
                >
                  Do odznaki brakuje: {nextBadge.summary}
                </div>
                <KangurProgressBar
                  accent='amber'
                  className='max-w-md'
                  data-testid='kangur-result-followup-badge-bar'
                  size='sm'
                  value={nextBadge.progressPercent}
                />
              </>
            ) : null}
          </div>
        </KangurInfoCard>
      ) : null}

      <div className='w-full max-w-2xl'>
        <KangurGameHomeMomentumWidget basePath={basePath} progress={progress} />
      </div>
    </div>
  );
}
