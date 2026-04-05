import React from 'react';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';
import { KangurSubjectGroupSection } from '@/features/kangur/ui/components/KangurSubjectGroupSection';
import { KangurSectionHeading } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurGameOperationSelectorQuickPracticeSectionProps } from './KangurGameOperationSelectorWidget.types';
import {
  renderKangurGameOperationSelectorQuickPracticeDescription,
  renderKangurGameOperationSelectorQuickPracticeGroupLabel,
  renderKangurGameOperationSelectorQuickPracticeTitle,
} from './KangurGameOperationSelectorWidget.utils';
import { KangurGameOperationSelectorQuickPracticeOptionCard } from './KangurGameOperationSelectorQuickPracticeOptionCard';

export function KangurGameOperationSelectorQuickPracticeSection({
  fallbackCopy,
  filteredLessonQuizGroups,
  gamePageTranslations,
  isSixYearOld,
  quickPracticeDescription,
  quickPracticeGameChipLabel,
  quickPracticeTitle,
  recommendation,
  recommendedLessonQuizScreen,
  setScreen,
}: KangurGameOperationSelectorQuickPracticeSectionProps): React.JSX.Element {
  return (
    <section
      aria-labelledby='kangur-game-quick-practice-heading'
      className='w-full max-w-3xl space-y-4'
    >
      <KangurSectionHeading
        accent='violet'
        align='left'
        description={renderKangurGameOperationSelectorQuickPracticeDescription({
          isSixYearOld,
          quickPracticeDescription,
        })}
        headingAs='h3'
        headingSize='sm'
        title={renderKangurGameOperationSelectorQuickPracticeTitle({
          isSixYearOld,
          quickPracticeTitle,
        })}
        titleId='kangur-game-quick-practice-heading'
      />
      <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        {filteredLessonQuizGroups.map((group) => (
          <KangurSubjectGroupSection
            key={group.value}
            ariaLabel={translateRecommendationWithFallback(
              gamePageTranslations,
              'operationSelector.quickPractice.groupAria',
              fallbackCopy.quickPractice.groupAria(group.label),
              { group: group.label }
            )}
            className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
            label={renderKangurGameOperationSelectorQuickPracticeGroupLabel({
              group,
              isSixYearOld,
            })}
          >
            <div className='flex w-full flex-col kangur-panel-gap'>
              {group.options.map((option) => (
                <KangurGameOperationSelectorQuickPracticeOptionCard
                  key={option.onSelectScreen}
                  fallbackCopy={fallbackCopy}
                  gamePageTranslations={gamePageTranslations}
                  isRecommended={recommendedLessonQuizScreen === option.onSelectScreen}
                  isSixYearOld={isSixYearOld}
                  option={option}
                  quickPracticeGameChipLabel={quickPracticeGameChipLabel}
                  recommendation={recommendation}
                  setScreen={setScreen}
                />
              ))}
            </div>
          </KangurSubjectGroupSection>
        ))}
      </div>
    </section>
  );
}
