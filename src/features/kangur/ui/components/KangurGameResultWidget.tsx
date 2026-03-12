'use client';

import KangurGameHomeMomentumWidget from '@/features/kangur/ui/components/KangurGameHomeMomentumWidget';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import ResultScreen from '@/features/kangur/ui/components/ResultScreen';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurCardDescription,
  KangurCardTitle,
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
                data-testid='kangur-result-reward-chip'
                labelStyle='caps'
                size='sm'
              >
                Nagroda za runde
              </KangurStatusChip>
              <KangurStatusChip
                accent='violet'
                data-testid='kangur-result-reward-total'
                labelStyle='caps'
                size='sm'
              >
                +{xpToast.xpGained} XP
              </KangurStatusChip>
            </div>

            <KangurCardTitle data-testid='kangur-result-reward-title'>
              {xpToast.recommendation
                ? 'Ta runda trafila w polecany kierunek i przesunela postep do przodu.'
                : 'Ta runda przesunela postep do przodu.'}
            </KangurCardTitle>

            <KangurRewardBreakdownChips
              accent='slate'
              breakdown={xpToast.breakdown}
              className='gap-2'
              dataTestId='kangur-result-reward-breakdown'
              itemDataTestIdPrefix='kangur-result-reward-breakdown'
            />

            {xpToast.nextBadge ? (
              <div
                className='text-xs leading-6 [color:var(--kangur-page-text)]'
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
                data-testid='kangur-result-recommendation-chip'
                labelStyle='caps'
                size='sm'
              >
                Zagrano zgodnie z rekomendacja
              </KangurStatusChip>
              <KangurStatusChip
                accent='indigo'
                data-testid='kangur-result-recommendation-label'
                labelStyle='caps'
                size='sm'
              >
                {activeSessionRecommendation.label}
              </KangurStatusChip>
            </div>
            <KangurCardTitle data-testid='kangur-result-recommendation-title'>
              {activeSessionRecommendation.title}
            </KangurCardTitle>
            {activeSessionRecommendation.description ? (
              <KangurCardDescription
                data-testid='kangur-result-recommendation-description'
                relaxed
                size='xs'
              >
                {activeSessionRecommendation.description}
              </KangurCardDescription>
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
                data-testid='kangur-result-badges-chip'
                labelStyle='caps'
                size='sm'
              >
                Nowe odznaki
              </KangurStatusChip>
              <KangurStatusChip
                accent='violet'
                data-testid='kangur-result-badges-count'
                labelStyle='caps'
                size='sm'
              >
                {unlockedBadgeDetails.length}
              </KangurStatusChip>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              {unlockedBadgeDetails.map((badge) => (
                <div
                  className='soft-card rounded-[22px] border border-amber-200/80 px-4 py-3 text-left'
                  data-testid={`kangur-result-badge-${badge.id}`}
                  key={badge.id}
                  style={{
                    background:
                      'color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(254,243,199,0.9))',
                  }}
                >
                  <KangurCardTitle>
                    {badge.emoji} {badge.name}
                  </KangurCardTitle>
                  <KangurCardDescription className='mt-1' relaxed size='xs'>
                    {badge.desc}
                  </KangurCardDescription>
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
                    data-testid='kangur-result-followup-quest-chip'
                    labelStyle='caps'
                    size='sm'
                  >
                    Misja dnia ukonczona
                  </KangurStatusChip>
                  {xpToast.dailyQuest.xpAwarded > 0 ? (
                    <KangurStatusChip
                      accent='amber'
                      data-testid='kangur-result-followup-quest-reward-chip'
                      labelStyle='caps'
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
                  data-testid='kangur-result-followup-badge-chip'
                  labelStyle='caps'
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
                  data-testid='kangur-result-followup-quest-status-chip'
                  labelStyle='caps'
                  size='sm'
                >
                  {currentQuest.reward.label}
                </KangurStatusChip>
              ) : null}
            </div>

            {xpToast.dailyQuest ? (
              <>
                <KangurCardTitle data-testid='kangur-result-followup-title'>
                  {xpToast.dailyQuest.title}
                </KangurCardTitle>
                <KangurCardDescription
                  data-testid='kangur-result-followup-description'
                  relaxed
                  size='xs'
                >
                  {xpToast.dailyQuest.summary}
                </KangurCardDescription>
              </>
            ) : nextBadge ? (
              <>
                <KangurCardTitle data-testid='kangur-result-followup-title'>
                  {nextBadge.emoji} {nextBadge.name}
                </KangurCardTitle>
                <KangurCardDescription
                  data-testid='kangur-result-followup-description'
                  relaxed
                  size='xs'
                >
                  Do odznaki brakuje: {nextBadge.summary}
                </KangurCardDescription>
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
