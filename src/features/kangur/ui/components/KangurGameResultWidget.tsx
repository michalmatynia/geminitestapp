import type { ComponentProps, ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import KangurGameHomeMomentumWidget from '@/features/kangur/ui/components/KangurGameHomeMomentumWidget';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import ResultScreen from '@/features/kangur/ui/components/ResultScreen';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurCardDescription,
  KangurCardTitle,
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME, KANGUR_WRAP_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import { getNextLockedBadge, getProgressBadges } from '@/features/kangur/ui/services/progress';
import { translateKangurProgressWithFallback } from '@/features/kangur/ui/services/progress-i18n';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurResultSectionCardProps = {
  accent: ComponentProps<typeof KangurInfoCard>['accent'];
  children: ReactNode;
  testId: string;
};

function KangurResultSectionCard({
  accent,
  children,
  testId,
}: KangurResultSectionCardProps): React.JSX.Element {
  const cardAccent = accent;
  const cardTestId = testId;

  return (
    <KangurInfoCard
      accent={cardAccent}
      className='w-full max-w-2xl rounded-[28px]'
      data-testid={cardTestId}
      padding='md'
      tone='accent'
    >
      <div className='flex flex-col kangur-panel-gap'>{children}</div>
    </KangurInfoCard>
  );
}

function KangurResultSectionChips({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className={KANGUR_WRAP_ROW_CLASSNAME}>{children}</div>;
}

type KangurGameResultFallbackCopy = {
  rewardChip: string;
  rewardTitleDefault: string;
  rewardTitleRecommended: string;
  nextBadgePrefix: string;
  recommendationPrefix: string;
  recommendationPlayedChip: string;
  newBadgesChip: string;
  dailyQuestCompletedChip: string;
  dailyQuestBonus: (xp: number) => string;
  nextBadgeChip: string;
  nextBadgeRemaining: (summary: string) => string;
};

const getGameResultFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): KangurGameResultFallbackCopy => {
  if (locale === 'uk') {
    return {
      rewardChip: 'Нагорода за раунд',
      rewardTitleDefault: 'Цей раунд просунув твій прогрес уперед.',
      rewardTitleRecommended: 'Цей раунд влучив у рекомендований шлях і просунув твій прогрес.',
      nextBadgePrefix: 'Наступний значок:',
      recommendationPrefix: 'Рекомендований шлях:',
      recommendationPlayedChip: 'Зіграно за рекомендацією',
      newBadgesChip: 'Нові значки',
      dailyQuestCompletedChip: 'Місію дня завершено',
      dailyQuestBonus: (xp) => `Бонус +${xp} XP`,
      nextBadgeChip: 'Наступний значок',
      nextBadgeRemaining: (summary) => `До значка залишилось: ${summary}`,
    };
  }

  if (locale === 'de') {
    return {
      rewardChip: 'Belohnung fur die Runde',
      rewardTitleDefault: 'Diese Runde hat deinen Fortschritt vorangebracht.',
      rewardTitleRecommended:
        'Diese Runde hat den empfohlenen Weg getroffen und deinen Fortschritt vorangebracht.',
      nextBadgePrefix: 'Nachstes Abzeichen:',
      recommendationPrefix: 'Empfohlene Richtung:',
      recommendationPlayedChip: 'Mit Empfehlung gespielt',
      newBadgesChip: 'Neue Abzeichen',
      dailyQuestCompletedChip: 'Tagesmission abgeschlossen',
      dailyQuestBonus: (xp) => `Bonus +${xp} XP`,
      nextBadgeChip: 'Nachstes Abzeichen',
      nextBadgeRemaining: (summary) => `Bis zum Abzeichen fehlen: ${summary}`,
    };
  }

  if (locale === 'en') {
    return {
      rewardChip: 'Reward for the round',
      rewardTitleDefault: 'This round moved your progress forward.',
      rewardTitleRecommended:
        'This round matched the recommended path and moved your progress forward.',
      nextBadgePrefix: 'Next badge:',
      recommendationPrefix: 'Recommended path:',
      recommendationPlayedChip: 'Played with the recommendation',
      newBadgesChip: 'New badges',
      dailyQuestCompletedChip: 'Daily mission completed',
      dailyQuestBonus: (xp) => `Bonus +${xp} XP`,
      nextBadgeChip: 'Next badge',
      nextBadgeRemaining: (summary) => `Remaining to unlock: ${summary}`,
    };
  }

  return {
    rewardChip: 'Nagroda za runde',
    rewardTitleDefault: 'Ta runda przesunęła postęp do przodu.',
    rewardTitleRecommended:
      'Ta runda trafiła w polecany kierunek i przesunęła postęp do przodu.',
    nextBadgePrefix: 'Następna odznaka:',
    recommendationPrefix: 'Polecony kierunek:',
    recommendationPlayedChip: 'Zagrano zgodnie z rekomendacja',
    newBadgesChip: 'Nowe odznaki',
    dailyQuestCompletedChip: 'Misja dnia ukończona',
    dailyQuestBonus: (xp) => `Bonus +${xp} XP`,
    nextBadgeChip: 'Następna odznaka',
    nextBadgeRemaining: (summary) => `Do odznaki brakuje: ${summary}`,
  };
};

export function KangurGameResultWidget(): React.JSX.Element | null {
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const resultTranslations = useTranslations('KangurGameResult');
  const progressTranslations = useTranslations('KangurProgressRuntime');
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
  const { subject, subjectKey } = useKangurSubjectFocus();

  if (screen !== 'result') {
    return null;
  }

  const progressLocalizer = { translate: progressTranslations };
  const currentQuest = getCurrentKangurDailyQuest(progress, {
    locale: normalizedLocale,
    ownerKey: subjectKey,
    subject,
    translate: progressTranslations,
  });
  const fallbackCopy = getGameResultFallbackCopy(normalizedLocale);
  const nextBadge = getNextLockedBadge(progress, progressLocalizer);
  const unlockedBadgeIds = new Set(xpToast.newBadges ?? []);
  const unlockedBadgeDetails = getProgressBadges(progress, progressLocalizer).filter((badge) =>
    unlockedBadgeIds.has(badge.id)
  );

  return (
    <div className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
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
        <KangurResultSectionCard accent='indigo' testId='kangur-result-reward-card'>
          <KangurResultSectionChips>
            <KangurStatusChip
              accent='indigo'
              data-testid='kangur-result-reward-chip'
              labelStyle='caps'
              size='sm'
            >
              {translateKangurProgressWithFallback(
                resultTranslations,
                'resultWidget.rewardChip',
                fallbackCopy.rewardChip
              )}
            </KangurStatusChip>
            <KangurStatusChip
              accent='violet'
              data-testid='kangur-result-reward-total'
              labelStyle='caps'
              size='sm'
            >
              +{xpToast.xpGained} XP
            </KangurStatusChip>
          </KangurResultSectionChips>

          <KangurCardTitle data-testid='kangur-result-reward-title'>
            {xpToast.recommendation
              ? translateKangurProgressWithFallback(
                resultTranslations,
                'resultWidget.rewardTitleRecommended',
                fallbackCopy.rewardTitleRecommended
              )
              : translateKangurProgressWithFallback(
                  resultTranslations,
                  'resultWidget.rewardTitleDefault',
                  fallbackCopy.rewardTitleDefault
                )}
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
              className='break-words text-xs leading-6 [color:var(--kangur-page-text)]'
              data-testid='kangur-result-reward-next-badge'
            >
              {translateKangurProgressWithFallback(
                resultTranslations,
                'resultWidget.nextBadgePrefix',
                fallbackCopy.nextBadgePrefix
              )}{' '}
              {xpToast.nextBadge.emoji} {xpToast.nextBadge.name} ·{' '}
              {xpToast.nextBadge.summary}
            </div>
          ) : null}
          {xpToast.recommendation ? (
            <div
              className='break-words text-xs leading-6 text-violet-700'
              data-testid='kangur-result-reward-recommendation'
            >
              {translateKangurProgressWithFallback(
                resultTranslations,
                'resultWidget.recommendationPrefix',
                fallbackCopy.recommendationPrefix
              )}{' '}
              {xpToast.recommendation.title} · {xpToast.recommendation.summary}
            </div>
          ) : null}
        </KangurResultSectionCard>
      ) : null}

      {activeSessionRecommendation ? (
        <KangurRecommendationCard
          accent='violet'
          bodyClassName='kangur-panel-gap'
          className='w-full max-w-2xl rounded-[28px]'
          contentClassName='kangur-panel-gap'
          dataTestId='kangur-result-recommendation-card'
          description={activeSessionRecommendation.description}
          descriptionRelaxed
          descriptionSize='xs'
          descriptionTestId='kangur-result-recommendation-description'
          headerExtras={
            <KangurStatusChip
              accent='indigo'
              data-testid='kangur-result-recommendation-label'
              labelStyle='caps'
              size='sm'
            >
              {activeSessionRecommendation.label}
            </KangurStatusChip>
          }
          label={translateKangurProgressWithFallback(
            resultTranslations,
            'resultWidget.recommendationPlayedChip',
            fallbackCopy.recommendationPlayedChip
          )}
          labelSize='sm'
          labelStyle='caps'
          labelTestId='kangur-result-recommendation-chip'
          title={activeSessionRecommendation.title}
          titleTestId='kangur-result-recommendation-title'
        />
      ) : null}

      {unlockedBadgeDetails.length > 0 ? (
        <KangurResultSectionCard accent='amber' testId='kangur-result-badges-card'>
          <KangurResultSectionChips>
            <KangurStatusChip
              accent='amber'
              data-testid='kangur-result-badges-chip'
              labelStyle='caps'
              size='sm'
            >
              {translateKangurProgressWithFallback(
                resultTranslations,
                'resultWidget.newBadgesChip',
                fallbackCopy.newBadgesChip
              )}
            </KangurStatusChip>
            <KangurStatusChip
              accent='violet'
              data-testid='kangur-result-badges-count'
              labelStyle='caps'
              size='sm'
            >
              {unlockedBadgeDetails.length}
            </KangurStatusChip>
          </KangurResultSectionChips>

          <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
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
        </KangurResultSectionCard>
      ) : null}

      {xpToast.dailyQuest || nextBadge ? (
        <KangurResultSectionCard
          accent={xpToast.dailyQuest ? 'emerald' : 'amber'}
          testId='kangur-result-followup-card'
        >
          <KangurResultSectionChips>
            {xpToast.dailyQuest ? (
              <>
                <KangurStatusChip
                  accent='emerald'
                  data-testid='kangur-result-followup-quest-chip'
                  labelStyle='caps'
                  size='sm'
                >
                  {translateKangurProgressWithFallback(
                    resultTranslations,
                    'resultWidget.dailyQuestCompletedChip',
                    fallbackCopy.dailyQuestCompletedChip
                  )}
                </KangurStatusChip>
                {xpToast.dailyQuest.xpAwarded > 0 ? (
                  <KangurStatusChip
                    accent='amber'
                    data-testid='kangur-result-followup-quest-reward-chip'
                    labelStyle='caps'
                    size='sm'
                  >
                    {translateKangurProgressWithFallback(
                      resultTranslations,
                      'resultWidget.dailyQuestBonus',
                      fallbackCopy.dailyQuestBonus(xpToast.dailyQuest.xpAwarded),
                      { xp: xpToast.dailyQuest.xpAwarded }
                    )}
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
                {translateKangurProgressWithFallback(
                  resultTranslations,
                  'resultWidget.nextBadgeChip',
                  fallbackCopy.nextBadgeChip
                )}
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
          </KangurResultSectionChips>

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
                {translateKangurProgressWithFallback(
                  resultTranslations,
                  'resultWidget.nextBadgeRemaining',
                  fallbackCopy.nextBadgeRemaining(nextBadge.summary),
                  { summary: nextBadge.summary }
                )}
              </KangurCardDescription>
              <KangurProgressBar
                accent='amber'
                className='w-full max-w-md'
                data-testid='kangur-result-followup-badge-bar'
                size='sm'
                value={nextBadge.progressPercent}
              />
            </>
          ) : null}
        </KangurResultSectionCard>
      ) : null}

      <div className='w-full max-w-2xl'>
        <KangurGameHomeMomentumWidget basePath={basePath} progress={progress} />
      </div>
    </div>
  );
}
