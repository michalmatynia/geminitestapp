'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';

import {
  KANGUR_LESSON_COMPONENT_ORDER,
  KANGUR_LESSON_LIBRARY,
} from '@/features/kangur/settings';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';
import KangurGameSetupMomentumCard from '@/features/kangur/ui/components/KangurGameSetupMomentumCard';
import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/KangurGrajmyWordmark';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { KangurTrainingSetupPanel } from '@/features/kangur/ui/components/KangurTrainingSetupPanel';
import OperationSelector from '@/features/kangur/ui/components/OperationSelector';
import { KangurSubjectGroupSection } from '@/features/kangur/ui/components/KangurSubjectGroupSection';
import { KangurTreningWordmark } from '@/features/kangur/ui/components/KangurTreningWordmark';
import { getKangurSixYearOldSubjectVisual } from '@/features/kangur/ui/constants/six-year-old-visuals';
import { getKangurSubjectGroups } from '@/features/kangur/ui/constants/subject-groups';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import {
  KangurButton,
  KangurInfoCard,
  KangurIconBadge,
  KangurPanelRow,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_RELAXED_ROW_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_START_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getRecommendedTrainingSetup,
} from '@/features/kangur/ui/services/game-setup-recommendations';
import {
  translateRecommendationWithFallback,
} from '@/features/kangur/ui/services/recommendation-i18n';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  KangurLessonComponentId,
  KangurLesson,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  getOperationSelectorRecommendation,
  OPERATION_LESSON_QUIZ_SCREENS,
} from './KangurGameOperationSelectorWidget.logic';
import { getOperationSelectorFallbackCopy } from './KangurGameOperationSelectorWidget.copy';
import type { LessonQuizOption } from './KangurGameOperationSelectorWidget.types';

type KangurGameOperationSelectorTranslations = ReturnType<typeof useTranslations>;
type KangurGameOperationSelectorRuntime = ReturnType<typeof useKangurGameRuntime>;
type KangurGameOperationSelectorScreen = KangurGameOperationSelectorRuntime['screen'];
type KangurGameOperationSelectorSubject = ReturnType<typeof useKangurSubjectFocus>['subject'];
type KangurGameOperationSelectorRecommendation = ReturnType<typeof getOperationSelectorRecommendation>;
type KangurGameOperationSelectorAssignment = KangurGameOperationSelectorRuntime['activePracticeAssignment'];
type KangurGameOperationSelectorAssignmentMode = 'active' | 'queue';

type KangurGameOperationSelectorQuizGroup = {
  label: string;
  options: LessonQuizOption[];
  value: KangurLessonSubject;
};

type KangurGameOperationRecommendationCardProps = {
  compactActionClassName: string;
  onRecommendationSelect: () => void;
  recommendation: KangurGameOperationSelectorRecommendation;
  showMathSections: boolean;
};

type KangurGameOperationSelectorQuickPracticeSectionProps = {
  fallbackCopy: ReturnType<typeof getOperationSelectorFallbackCopy>;
  filteredLessonQuizGroups: KangurGameOperationSelectorQuizGroup[];
  gamePageTranslations: KangurGameOperationSelectorTranslations;
  isSixYearOld: boolean;
  quickPracticeDescription: string;
  quickPracticeGameChipLabel: string;
  quickPracticeTitle: string;
  recommendation: KangurGameOperationSelectorRecommendation;
  recommendedLessonQuizScreen: string | null;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
  subject: KangurGameOperationSelectorSubject;
};

type KangurGameOperationSelectorTrainingSectionProps = {
  basePath: string;
  fallbackCopy: ReturnType<typeof getOperationSelectorFallbackCopy>;
  gamePageTranslations: KangurGameOperationSelectorTranslations;
  handleHome: KangurGameOperationSelectorRuntime['handleHome'];
  handleStartTraining: KangurGameOperationSelectorRuntime['handleStartTraining'];
  locale: string;
  mixedPracticeAssignment: KangurGameOperationSelectorAssignment;
  normalizedProgress: KangurGameOperationSelectorRuntime['progress'];
  showMathSections: boolean;
  suggestedTraining: ReturnType<typeof getRecommendedTrainingSetup>;
  trainingSectionRef: React.RefObject<HTMLElement | null>;
  trainingSetupTitle: string;
  trainingWordmarkLabel: string;
};

const resolveKangurGameOperationMixedPracticeAssignment = ({
  activePracticeAssignment,
  practiceAssignmentsByOperation,
}: {
  activePracticeAssignment: KangurGameOperationSelectorAssignment;
  practiceAssignmentsByOperation: KangurGameOperationSelectorRuntime['practiceAssignmentsByOperation'];
}): KangurGameOperationSelectorAssignment =>
  practiceAssignmentsByOperation.mixed ??
  (activePracticeAssignment?.target.operation === 'mixed' ? activePracticeAssignment : null);

const resolveKangurGameOperationPrimaryAssignment = (
  activePracticeAssignment: KangurGameOperationSelectorAssignment
): KangurGameOperationSelectorAssignment =>
  activePracticeAssignment && activePracticeAssignment.target.operation !== 'mixed'
    ? activePracticeAssignment
    : null;

function useKangurGameOperationSelectorSubjectScreenSync({
  screen,
  setScreen,
  subject,
}: {
  screen: KangurGameOperationSelectorScreen;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
  subject: KangurGameOperationSelectorSubject;
}): void {
  useEffect(() => {
    if (subject === 'maths') {
      return;
    }

    if (screen === 'training') {
      setScreen('operation');
    }
  }, [screen, setScreen, subject]);
}

function useKangurGameOperationSelectorTrainingScroll({
  screen,
  trainingSectionRef,
}: {
  screen: KangurGameOperationSelectorScreen;
  trainingSectionRef: React.RefObject<HTMLElement | null>;
}): void {
  useEffect(() => {
    if (screen !== 'training') {
      return;
    }

    trainingSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [screen, trainingSectionRef]);
}

const resolveKangurGameOperationSelectorCompactActionClassName = (
  isCoarsePointer: boolean
): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full shrink-0 sm:w-auto';

const resolveKangurGameOperationSelectorIntroLabel = (
  subject: KangurGameOperationSelectorSubject,
  gamePageTranslations: KangurGameOperationSelectorTranslations,
  fallbackCopy: ReturnType<typeof getOperationSelectorFallbackCopy>
): string => {
  if (subject === 'maths') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.maths',
      fallbackCopy.intro.maths
    );
  }

  if (subject === 'alphabet') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.alphabet',
      fallbackCopy.intro.alphabet
    );
  }

  if (subject === 'art') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.art',
      fallbackCopy.intro.art
    );
  }

  if (subject === 'music') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.music',
      fallbackCopy.intro.music
    );
  }

  if (subject === 'geometry') {
    return translateRecommendationWithFallback(
      gamePageTranslations,
      'operationSelector.intro.geometry',
      fallbackCopy.intro.geometry
    );
  }

  return translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.intro.language',
    fallbackCopy.intro.language
  );
};

const renderKangurGameOperationSelectorIntroDescription = ({
  gameIntroDescriptionLabel,
  isSixYearOld,
  subject,
}: {
  gameIntroDescriptionLabel: string;
  isSixYearOld: boolean;
  subject: KangurGameOperationSelectorSubject;
}): React.JSX.Element | string => {
  if (!isSixYearOld) {
    return gameIntroDescriptionLabel;
  }

  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);

  return (
    <KangurVisualCueContent
      className='text-lg'
      detail={
        <span className='inline-flex items-center gap-1.5 text-lg'>
          {subjectVisual.introSteps.map((stepIcon, index) => (
            <span key={`six-year-old-intro-step-${subject}-${index}`}>{stepIcon}</span>
          ))}
        </span>
      }
      detailTestId='kangur-game-operation-intro-detail'
      icon={subjectVisual.icon}
      iconClassName='text-xl'
      iconTestId='kangur-game-operation-intro-icon'
      label={gameIntroDescriptionLabel}
    />
  );
};

const renderKangurGameOperationSelectorQuickPracticeDescription = ({
  isSixYearOld,
  quickPracticeDescription,
}: {
  isSixYearOld: boolean;
  quickPracticeDescription: string;
}): React.JSX.Element | string =>
  isSixYearOld ? (
    <KangurVisualCueContent
      detail={
        <span className='inline-flex items-center gap-1.5 text-lg'>
          <span>🎮</span>
          <span>⚡</span>
          <span>🎯</span>
        </span>
      }
      detailTestId='kangur-quick-practice-description-detail'
      icon='👆'
      iconClassName='text-xl'
      iconTestId='kangur-quick-practice-description-icon'
      label={quickPracticeDescription}
    />
  ) : (
    quickPracticeDescription
  );

const renderKangurGameOperationSelectorQuickPracticeTitle = ({
  isSixYearOld,
  quickPracticeTitle,
}: {
  isSixYearOld: boolean;
  quickPracticeTitle: string;
}): React.JSX.Element | string =>
  isSixYearOld ? (
    <KangurVisualCueContent
      detail='🎮'
      detailClassName='text-lg'
      detailTestId='kangur-quick-practice-heading-detail'
      icon='⚡'
      iconClassName='text-xl'
      iconTestId='kangur-quick-practice-heading-icon'
      label={quickPracticeTitle}
    />
  ) : (
    quickPracticeTitle
  );

const renderKangurGameOperationSelectorQuickPracticeGroupLabel = ({
  group,
  isSixYearOld,
}: {
  group: KangurGameOperationSelectorQuizGroup;
  isSixYearOld: boolean;
}): React.JSX.Element | string =>
  isSixYearOld ? (
    <KangurVisualCueContent
      detail={getKangurSixYearOldSubjectVisual(group.value).detail}
      detailClassName='text-base'
      detailTestId={`kangur-quick-practice-group-detail-${group.value}`}
      icon={getKangurSixYearOldSubjectVisual(group.value).icon}
      iconClassName='text-lg'
      iconTestId={`kangur-quick-practice-group-icon-${group.value}`}
      label={group.label}
    />
  ) : (
    group.label
  );

const renderKangurGameOperationSelectorGameChipLabel = ({
  isSixYearOld,
  optionScreen,
  quickPracticeGameChipLabel,
}: {
  isSixYearOld: boolean;
  optionScreen: string;
  quickPracticeGameChipLabel: string;
}): ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      icon='🎮'
      iconClassName='text-base'
      iconTestId={`kangur-quick-practice-game-chip-icon-${optionScreen}`}
      label={quickPracticeGameChipLabel}
    />
  ) : (
    quickPracticeGameChipLabel
  );

const renderKangurGameOperationSelectorRecommendationChipLabel = ({
  isSixYearOld,
  optionScreen,
  recommendationLabel,
}: {
  isSixYearOld: boolean;
  optionScreen: string;
  recommendationLabel: string;
}): ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      icon='🎯'
      iconClassName='text-base'
      iconTestId={`kangur-quick-practice-recommendation-icon-${optionScreen}`}
      label={recommendationLabel}
    />
  ) : (
    recommendationLabel
  );

const handleKangurGameOperationRecommendationSelect = ({
  handleSelectOperation,
  recommendation,
  screen,
  setScreen,
  trainingSectionRef,
}: {
  handleSelectOperation: KangurGameOperationSelectorRuntime['handleSelectOperation'];
  recommendation: KangurGameOperationSelectorRecommendation;
  screen: KangurGameOperationSelectorScreen;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
  trainingSectionRef: React.RefObject<HTMLElement | null>;
}): void => {
  if (!recommendation) {
    return;
  }

  if (recommendation.target.kind === 'training') {
    if (screen === 'training') {
      trainingSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } else {
      setScreen('training');
    }
    return;
  }

  if (recommendation.target.kind === 'screen') {
    setScreen(recommendation.target.screen);
    return;
  }

  handleSelectOperation(recommendation.target.operation, recommendation.target.difficulty, {
    recommendation: {
      description: recommendation.description,
      label: recommendation.label,
      source: 'operation_selector',
      title: recommendation.title,
    },
  });
};

function KangurGameOperationPracticeAssignmentBanner({
  assignment,
  basePath,
  mode,
}: {
  assignment: KangurGameOperationSelectorAssignment;
  basePath: string;
  mode: KangurGameOperationSelectorAssignmentMode;
}): React.JSX.Element | null {
  if (!assignment) {
    return null;
  }

  return (
    <div className='flex w-full justify-center px-4'>
      <KangurPracticeAssignmentBanner assignment={assignment} basePath={basePath} mode={mode} />
    </div>
  );
}

function KangurGameOperationRecommendationCard({
  compactActionClassName,
  onRecommendationSelect,
  recommendation,
  showMathSections,
}: KangurGameOperationRecommendationCardProps): React.JSX.Element | null {
  if (!showMathSections || !recommendation) {
    return null;
  }

  return (
    <KangurInfoCard
      accent={recommendation.accent}
      className='w-full max-w-3xl rounded-[28px]'
      data-testid='kangur-operation-recommendation-card'
      padding='md'
      tone='accent'
    >
      <KangurPanelRow className='sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurStatusChip
            accent={recommendation.accent}
            className='text-[11px] uppercase tracking-[0.16em]'
            data-testid='kangur-operation-recommendation-label'
            size='sm'
          >
            {recommendation.label}
          </KangurStatusChip>
          <p
            className='mt-3 break-words text-lg font-extrabold [color:var(--kangur-page-text)]'
            data-testid='kangur-operation-recommendation-title'
          >
            {recommendation.title}
          </p>
          <p
            className='mt-1 break-words text-sm [color:var(--kangur-page-muted-text)]'
            data-testid='kangur-operation-recommendation-description'
          >
            {recommendation.description}
          </p>
        </div>
        <KangurButton
          className={compactActionClassName}
          data-testid='kangur-operation-recommendation-action'
          size='sm'
          type='button'
          variant='surface'
          onClick={onRecommendationSelect}
        >
          {recommendation.actionLabel}
        </KangurButton>
      </KangurPanelRow>
    </KangurInfoCard>
  );
}

function KangurGameOperationSelectorOperationSection({
  handleSelectOperation,
  practiceAssignmentsByOperation,
  recommendation,
  showMathSections,
}: {
  handleSelectOperation: KangurGameOperationSelectorRuntime['handleSelectOperation'];
  practiceAssignmentsByOperation: KangurGameOperationSelectorRuntime['practiceAssignmentsByOperation'];
  recommendation: KangurGameOperationSelectorRecommendation;
  showMathSections: boolean;
}): React.JSX.Element | null {
  if (!showMathSections) {
    return null;
  }

  return (
    <OperationSelector
      onSelect={handleSelectOperation}
      priorityAssignmentsByOperation={practiceAssignmentsByOperation}
      recommendedLabel={recommendation?.label}
      recommendedOperation={recommendation?.recommendedOperation}
    />
  );
}

function KangurGameOperationSelectorQuickPracticeOptionCard({
  fallbackCopy,
  gamePageTranslations,
  isRecommended,
  isSixYearOld,
  option,
  quickPracticeGameChipLabel,
  recommendation,
  setScreen,
}: {
  fallbackCopy: ReturnType<typeof getOperationSelectorFallbackCopy>;
  gamePageTranslations: KangurGameOperationSelectorTranslations;
  isRecommended: boolean;
  isSixYearOld: boolean;
  option: LessonQuizOption;
  quickPracticeGameChipLabel: string;
  recommendation: KangurGameOperationSelectorRecommendation;
  setScreen: KangurGameOperationSelectorRuntime['setScreen'];
}): React.JSX.Element {
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

function KangurGameOperationSelectorQuickPracticeSection({
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

function KangurGameOperationSelectorTrainingSection({
  basePath,
  fallbackCopy,
  gamePageTranslations,
  handleHome,
  handleStartTraining,
  locale,
  mixedPracticeAssignment,
  normalizedProgress,
  showMathSections,
  suggestedTraining,
  trainingSectionRef,
  trainingSetupTitle,
  trainingWordmarkLabel,
}: KangurGameOperationSelectorTrainingSectionProps): React.JSX.Element | null {
  if (!showMathSections) {
    return null;
  }

  return (
    <section
      aria-labelledby='kangur-game-training-heading'
      className='w-full max-w-3xl space-y-4'
      ref={trainingSectionRef}
    >
      <KangurPageIntroCard
        className='w-full'
        description={translateRecommendationWithFallback(
          gamePageTranslations,
          'screens.training.description',
          fallbackCopy.trainingSetupDescription
        )}
        headingAs='h3'
        headingSize='md'
        onBack={handleHome}
        showBackButton={false}
        testId='kangur-game-training-top-section'
        title={trainingSetupTitle}
        titleId='kangur-game-training-heading'
        visualTitle={
          <KangurTreningWordmark
            className='mx-auto'
            data-testid='kangur-training-heading-art'
            idPrefix='kangur-game-training-heading'
            label={trainingWordmarkLabel}
            locale={locale}
          />
        }
      />
      <KangurGameOperationPracticeAssignmentBanner
        assignment={mixedPracticeAssignment}
        basePath={basePath}
        mode='active'
      />
      <KangurGameSetupMomentumCard mode='training' progress={normalizedProgress} />
      <KangurTrainingSetupPanel
        onStart={(selection, options) => handleStartTraining(selection, options)}
        suggestedTraining={suggestedTraining}
      />
    </section>
  );
}

export function KangurGameOperationSelectorWidget(): React.JSX.Element | null {
  const locale = useLocale();
  const isCoarsePointer = useKangurCoarsePointer();
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = useMemo(
    () => getOperationSelectorFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const gamePageTranslations = useTranslations('KangurGamePage');
  const recommendationTranslations = useTranslations('KangurGameRecommendations');
  const trainingSetupTranslations = useTranslations('KangurGameRecommendations.trainingSetup');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const {
    activePracticeAssignment,
    basePath,
    handleHome,
    handleSelectOperation,
    handleStartTraining,
    practiceAssignmentsByOperation,
    progress,
    screen,
    setScreen,
  } = useKangurGameRuntime();
  const { subject, subjectKey } = useKangurSubjectFocus();
  const { ageGroup } = useKangurAgeGroupFocus();
  const subjectGroups = useMemo(() => getKangurSubjectGroups(locale), [locale]);
  const trainingSectionRef = useRef<HTMLElement | null>(null);
  const normalizedProgress = useMemo(() => {
    const defaults = createDefaultKangurProgressState();
    return {
      ...defaults,
      ...progress,
      badges: progress.badges ?? defaults.badges,
      operationsPlayed: progress.operationsPlayed ?? defaults.operationsPlayed,
      lessonMastery: progress.lessonMastery ?? defaults.lessonMastery,
      openedTasks: progress.openedTasks ?? defaults.openedTasks,
      lessonPanelProgress: progress.lessonPanelProgress ?? defaults.lessonPanelProgress,
      activityStats: progress.activityStats ?? defaults.activityStats,
    };
  }, [progress]);
  const dailyQuest = useMemo(
    () =>
      getCurrentKangurDailyQuest(normalizedProgress, {
        locale: normalizedLocale,
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      }),
    [normalizedLocale, normalizedProgress, runtimeTranslations, subject, subjectKey]
  );
  const recommendation = useMemo(
    () =>
      getOperationSelectorRecommendation(normalizedProgress, dailyQuest, fallbackCopy, {
        locale: normalizedLocale,
        translate: recommendationTranslations,
        progressTranslate: runtimeTranslations,
      }),
    [
      dailyQuest,
      fallbackCopy,
      normalizedLocale,
      normalizedProgress,
      recommendationTranslations,
      runtimeTranslations,
    ]
  );
  const suggestedTraining = useMemo(
    () =>
      getRecommendedTrainingSetup(normalizedProgress, {
        locale,
        translate: trainingSetupTranslations,
        progressTranslate: runtimeTranslations,
      }),
    [locale, normalizedProgress, runtimeTranslations, trainingSetupTranslations]
  );
  const operationSelectorTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.title',
    fallbackCopy.operationSelectorTitle
  );
  const trainingSetupTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.training.label',
    fallbackCopy.trainingSetupTitle
  );
  const trainingWordmarkLabel = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.training.wordmarkLabel',
    fallbackCopy.trainingSetupWordmarkLabel
  );
  const lessonsQuery = useKangurLessons({ subject, ageGroup, enabledOnly: true });
  const lessonQuizOptions = useMemo<LessonQuizOption[]>(() => {
    const enabledLessons = lessonsQuery.data ?? [];
    const lessonsByComponentId = new Map(
      enabledLessons.map((lesson) => [lesson.componentId, lesson] as const)
    );
    const componentSortOrder = new Map(
      KANGUR_LESSON_COMPONENT_ORDER.map((componentId, index) => [componentId, index] as const)
    );
    const resolveFallbackSortOrder = (componentIds: readonly KangurLessonComponentId[]): number => {
      const orders = componentIds
        .map((componentId) => componentSortOrder.get(componentId))
        .filter((order): order is number => typeof order === 'number');

      return orders.length > 0 ? Math.min(...orders) : Number.MAX_SAFE_INTEGER;
    };

    const options = fallbackCopy.lessonQuizDefinitions.flatMap((definition) => {
      const activeLessons = definition.lessonComponentIds
        .map((componentId) => lessonsByComponentId.get(componentId))
        .filter((lesson): lesson is KangurLesson => Boolean(lesson));

      if (activeLessons.length === 0) {
        const fallbackLessons = definition.lessonComponentIds
          .map((componentId) => KANGUR_LESSON_LIBRARY[componentId])
          .filter((lesson): lesson is KangurLessonTemplate => Boolean(lesson));

        if (fallbackLessons.length === 0) {
          return [];
        }

        const primaryLesson = fallbackLessons[0]!;
        return [
          {
            ...definition,
            subject: primaryLesson.subject,
            sortOrder: resolveFallbackSortOrder(definition.lessonComponentIds),
          },
        ];
      }

      const primaryLesson = activeLessons[0]!;
      const sortOrder = Math.min(...activeLessons.map((lesson) => lesson.sortOrder));

      return [
        {
          ...definition,
          subject: primaryLesson.subject,
          sortOrder,
        },
      ];
    });
    return options.sort((left, right) => left.sortOrder - right.sortOrder);
  }, [fallbackCopy.lessonQuizDefinitions, lessonsQuery.data, subject]);
  const lessonQuizGroups = useMemo(
    () =>
      subjectGroups.map((group) => ({
        ...group,
        options: lessonQuizOptions.filter((option) => option.subject === group.value),
      })).filter((group) => group.options.length > 0),
    [lessonQuizOptions, subjectGroups]
  );
  const filteredLessonQuizGroups = useMemo(
    () => lessonQuizGroups.filter((group) => group.value === subject),
    [lessonQuizGroups, subject]
  );
  const recommendedLessonQuizScreen = useMemo(() => {
    if (!recommendation) {
      return null;
    }

    if (recommendation.target.kind === 'screen') {
      return recommendation.target.screen;
    }

    if (recommendation.target.kind === 'operation') {
      return OPERATION_LESSON_QUIZ_SCREENS[recommendation.target.operation] ?? null;
    }

    return null;
  }, [recommendation]);
  const mixedPracticeAssignment =
    resolveKangurGameOperationMixedPracticeAssignment({
      activePracticeAssignment,
      practiceAssignmentsByOperation,
    });
  const operationPracticeAssignment =
    resolveKangurGameOperationPrimaryAssignment(activePracticeAssignment);
  const shouldRender = screen === 'operation' || screen === 'training';
  const showMathSections = subject === 'maths';
  const isSixYearOld = ageGroup === 'six_year_old';
  const compactActionClassName =
    resolveKangurGameOperationSelectorCompactActionClassName(isCoarsePointer);
  const gameIntroDescriptionLabel = resolveKangurGameOperationSelectorIntroLabel(
    subject,
    gamePageTranslations,
    fallbackCopy
  );
  const quickPracticeTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.title',
    fallbackCopy.quickPractice.title
  );
  const quickPracticeDescription = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.description',
    fallbackCopy.quickPractice.description
  );
  const quickPracticeGameChipLabel = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.gameChip',
    fallbackCopy.quickPractice.gameChip
  );
  const gameIntroDescription = renderKangurGameOperationSelectorIntroDescription({
    gameIntroDescriptionLabel,
    isSixYearOld,
    subject,
  });

  useKangurGameOperationSelectorSubjectScreenSync({ screen, setScreen, subject });
  useKangurGameOperationSelectorTrainingScroll({ screen, trainingSectionRef });

  if (!shouldRender) {
    return null;
  }

  const handleRecommendationSelect = (): void =>
    handleKangurGameOperationRecommendationSelect({
      handleSelectOperation,
      recommendation,
      screen,
      setScreen,
      trainingSectionRef,
    });

  return (
    <div className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPageIntroCard
        className='max-w-md'
        description={
          gameIntroDescription
        }
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-operation-top-section'
        title={operationSelectorTitle}
        visualTitle={
          <KangurGrajmyWordmark
            className='mx-auto'
            data-testid='kangur-grajmy-heading-art'
            idPrefix='kangur-game-operation-heading'
            label={operationSelectorTitle}
            locale={locale}
          />
        }
      />
      <KangurGameOperationPracticeAssignmentBanner
        assignment={showMathSections ? operationPracticeAssignment : null}
        basePath={basePath}
        mode='queue'
      />
      <KangurGameOperationRecommendationCard
        compactActionClassName={compactActionClassName}
        onRecommendationSelect={handleRecommendationSelect}
        recommendation={recommendation}
        showMathSections={showMathSections}
      />
      <KangurGameOperationSelectorOperationSection
        handleSelectOperation={handleSelectOperation}
        practiceAssignmentsByOperation={practiceAssignmentsByOperation}
        recommendation={recommendation}
        showMathSections={showMathSections}
      />
      <KangurGameOperationSelectorQuickPracticeSection
        fallbackCopy={fallbackCopy}
        filteredLessonQuizGroups={filteredLessonQuizGroups}
        gamePageTranslations={gamePageTranslations}
        isSixYearOld={isSixYearOld}
        quickPracticeDescription={quickPracticeDescription}
        quickPracticeGameChipLabel={quickPracticeGameChipLabel}
        quickPracticeTitle={quickPracticeTitle}
        recommendation={recommendation}
        recommendedLessonQuizScreen={recommendedLessonQuizScreen}
        setScreen={setScreen}
        subject={subject}
      />
      <KangurGameOperationSelectorTrainingSection
        basePath={basePath}
        fallbackCopy={fallbackCopy}
        gamePageTranslations={gamePageTranslations}
        handleHome={handleHome}
        handleStartTraining={handleStartTraining}
        locale={locale}
        mixedPracticeAssignment={mixedPracticeAssignment}
        normalizedProgress={normalizedProgress}
        showMathSections={showMathSections}
        suggestedTraining={suggestedTraining}
        trainingSectionRef={trainingSectionRef}
        trainingSetupTitle={trainingSetupTitle}
        trainingWordmarkLabel={trainingWordmarkLabel}
      />
    </div>
  );
}
