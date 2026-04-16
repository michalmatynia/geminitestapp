import React from 'react';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/summary-cards/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/summary-cards/KangurIconSummaryCardContent';
import {
  KangurIconBadge,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_RELAXED_ROW_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_START_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type { LessonQuizOption } from './KangurGameOperationSelectorWidget.types';
import {
  renderKangurGameOperationSelectorGameChipLabel,
  renderKangurGameOperationSelectorRecommendationChipLabel,
} from './KangurGameOperationSelectorWidget.utils';
import { useKangurGameOperationSelector } from './KangurGameOperationSelectorContext';

export function KangurGameOperationSelectorQuickPracticeOptionCard({
  option,
}: {
  option: LessonQuizOption;
}): React.JSX.Element {
  const {
    fallbackCopy,
    gamePageTranslations,
    isSixYearOld,
    quickPracticeGameChipLabel,
    recommendation,
    recommendedLessonQuizScreen,
    setScreen,
  } = useKangurGameOperationSelector();

  const isRecommended = recommendedLessonQuizScreen === option.onSelectScreen;

  const optionLabel = translateRecommendationWithFallback(
    gamePageTranslations,
    `screens.${option.onSelectScreen}.label`,
    option.label
  );
  const optionDescription = translateRecommendationWithFallback(
    gamePageTranslations,
    `screens.${option.onSelectScreen}.description`,
    option.description
  );

  return (
    <KangurIconSummaryOptionCard
      accent={option.accent}
      aria-label={translateRecommendationWithFallback(
        gamePageTranslations,
        'operationSelector.quickPractice.cardAria',
        fallbackCopy.quickPractice.cardAria(optionLabel),
        { label: optionLabel }
      )}
      buttonClassName='w-full rounded-[24px] p-4 text-left sm:rounded-[28px] sm:p-5'
      data-doc-id='home_quick_practice_action'
      data-testid={`kangur-quick-practice-card-${option.onSelectScreen}`}
      emphasis='accent'
      onClick={() => setScreen(option.onSelectScreen)}
    >
      <KangurIconSummaryCardContent
        aside={
          <>
            <KangurStatusChip
              accent={option.accent}
              aria-label={quickPracticeGameChipLabel}
              className='uppercase tracking-[0.14em]'
              data-testid={`kangur-quick-practice-game-chip-${option.onSelectScreen}`}
              size='sm'
            >
              {renderKangurGameOperationSelectorGameChipLabel({
                isSixYearOld,
                optionScreen: option.onSelectScreen,
                quickPracticeGameChipLabel,
              })}
            </KangurStatusChip>
            {isRecommended && recommendation ? (
              <KangurStatusChip
                accent={option.accent}
                aria-label={recommendation.label}
                className='text-[11px] font-semibold'
                data-testid={`kangur-quick-practice-recommendation-${option.onSelectScreen}`}
                size='sm'
              >
                {renderKangurGameOperationSelectorRecommendationChipLabel({
                  isSixYearOld,
                  optionScreen: option.onSelectScreen,
                  recommendationLabel: recommendation.label,
                })}
              </KangurStatusChip>
            ) : null}
          </>
        }
        asideClassName={`${KANGUR_WRAP_START_ROW_CLASSNAME} w-full sm:w-auto sm:flex-col sm:items-end sm:gap-2`}
        className={`w-full ${KANGUR_RELAXED_ROW_CLASSNAME} items-start sm:items-center`}
        contentClassName='w-full sm:flex-1'
        description={optionDescription}
        descriptionClassName='text-slate-500'
        headerClassName={`${KANGUR_TIGHT_ROW_CLASSNAME} items-start sm:items-start sm:justify-between`}
        icon={
          <KangurIconBadge accent={option.accent} className='shrink-0 scale-90 sm:scale-100' size='xl'>
            {option.emoji}
          </KangurIconBadge>
        }
        title={optionLabel}
        titleClassName='text-slate-800'
        titleWrapperClassName='w-full'
      />
    </KangurIconSummaryOptionCard>
  );
}
