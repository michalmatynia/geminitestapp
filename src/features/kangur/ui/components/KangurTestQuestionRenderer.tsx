'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import React from 'react';

import {
  getQuestionExplanationNarrationText,
  getQuestionStemNarrationText,
  questionDocumentNeedsRichRenderer,
  hasIllustration,
  hasRichChoiceContent,
} from '@/features/kangur/test-questions';
import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import { useOptionalKangurTestSuiteRuntime } from '@/features/kangur/ui/context/KangurTestSuiteRuntimeContext';
import {
  KangurInfoCard,
  KangurPanelIntro,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import { cn } from '@/features/kangur/shared/utils';

import { KangurLessonDocumentRenderer } from './KangurLessonDocumentRenderer';
import { KangurLessonNarrator } from './KangurLessonNarrator';
import { renderKangurQuestionIllustration } from './KangurQuestionIllustrationRenderer';
import {
  KangurTestChoiceCard,
  KangurTestChoiceCardBadge,
  KangurTestChoiceCardContent,
  KangurTestChoiceCardFeedback,
} from './KangurTestChoiceCard';

type Props = {
  contentId?: string | null;
  question: KangurTestQuestion;
  selectedLabel: string | null;
  onSelect: (label: string) => void;
  showAnswer: boolean;
  questionIndex?: number;
  totalQuestions?: number;
  showReadControl?: boolean;
  showSectionIntro?: boolean;
};

export function KangurTestQuestionRenderer({
  contentId = null,
  question,
  selectedLabel,
  onSelect,
  showAnswer,
  questionIndex,
  totalQuestions,
  showReadControl = true,
  showSectionIntro = true,
}: Props): React.JSX.Element {
  const runtime = useOptionalKangurTestSuiteRuntime();
  const sectionEntryId = showSectionIntro ? (showAnswer ? 'tests-review' : 'tests-question') : null;
  const { entry: sectionContent } = useKangurPageContentEntry(sectionEntryId);
  const presentation = question.presentation ?? { layout: 'classic', choiceStyle: 'list' };
  const stemDocument = question.stemDocument;
  const explanationDocument = question.explanationDocument;
  const richExplanationDocument = explanationDocument;
  const resolvedTotalQuestions = totalQuestions ?? runtime?.totalQuestions;
  const isAnswered = selectedLabel !== null;
  const isCorrect = selectedLabel === question.correctChoiceLabel;
  const choiceInteractionState = showAnswer ? 'locked' : 'interactive';
  const narrationSourceRef = React.useRef<HTMLDivElement | null>(null);
  const narratorLesson = React.useMemo<
    Pick<KangurLesson, 'id' | 'title' | 'description' | 'contentMode'>
  >(
    () => ({
      id: `kangur-test-question:${question.id}`,
      title: questionIndex !== undefined ? `Question ${questionIndex + 1}` : 'Question',
      description: question.prompt,
      contentMode: 'component',
    }),
    [question.id, question.prompt, questionIndex]
  );
  const narrationText = React.useMemo(() => {
    const parts = [
      questionIndex !== undefined && resolvedTotalQuestions !== undefined
        ? `Question ${questionIndex + 1} of ${resolvedTotalQuestions}.`
        : null,
      getQuestionStemNarrationText(question),
      ...question.choices.map((choice) =>
        [choice.label, choice.text, choice.description].filter(Boolean).join('. ') + '.'
      ),
      showAnswer ? `Correct answer: ${question.correctChoiceLabel}.` : null,
      showAnswer && question.explanation
        ? `Explanation. ${getQuestionExplanationNarrationText(question)}`
        : null,
    ];

    return parts.filter(Boolean).join(' ');
  }, [
    question.choices,
    question.correctChoiceLabel,
    question.explanation,
    question.prompt,
    questionIndex,
    resolvedTotalQuestions,
    showAnswer,
  ]);
  const renderRichStem = questionDocumentNeedsRichRenderer(stemDocument, question.prompt);
  const renderRichExplanation = questionDocumentNeedsRichRenderer(
    explanationDocument,
    question.explanation ?? ''
  );
  const choiceGrid = presentation.choiceStyle === 'grid' || hasRichChoiceContent(question);
  const handleChoiceSelect = (label: string): void => {
    if (choiceInteractionState === 'interactive') {
      onSelect(label);
    }
  };

  const stemContent = renderRichStem && stemDocument ? (
    <KangurLessonDocumentRenderer document={stemDocument} renderMode='lesson' />
  ) : (
    <p className='text-sm font-medium leading-relaxed [color:var(--kangur-page-text)]'>
      {question.prompt}
    </p>
  );

  const illustrationContent = hasIllustration(question) ? (
    renderKangurQuestionIllustration(question.illustration, 'my-2')
  ) : null;

  const promptContent =
    illustrationContent &&
    (presentation.layout === 'split-illustration-left' ||
      presentation.layout === 'split-illustration-right') ? (
        <div
          className={cn(
            'grid gap-4 rounded-[24px] border p-4 lg:grid-cols-2 [border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,var(--kangur-page-background))]',
            presentation.layout === 'split-illustration-left' && 'lg:[&>*:first-child]:order-2'
          )}
        >
          <div className='min-w-0'>{stemContent}</div>
          <div className='min-w-0'>{illustrationContent}</div>
        </div>
      ) : (
        <>
          {stemContent}
          {illustrationContent}
        </>
      );
  const answerRevealed = showAnswer;
  const sectionDescription =
    sectionContent?.summary ??
    (answerRevealed
      ? 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj krótkie wyjaśnienie.'
      : 'Wybierz jedną odpowiedź, a potem sprawdź omówienie i poprawny tok myślenia.');
  const sectionTitle =
    sectionContent?.title ?? (answerRevealed ? 'Omówienie odpowiedzi' : 'Pytanie testowe');
  const choiceInteractive = !answerRevealed;
  const questionContentId = contentId;
  const questionValue = question;

  return (
    <div className='space-y-4'>
      <div aria-hidden='true' className='sr-only' ref={narrationSourceRef}>
        {narrationText}
      </div>
      {showSectionIntro ? (
        <KangurPanelIntro
          data-testid='kangur-test-question-copy'
          description={sectionDescription}
          title={sectionTitle}
          titleAs='h2'
          titleClassName='text-lg font-bold tracking-[-0.02em]'
        />
      ) : null}
      {/* Header */}
      {questionIndex !== undefined && resolvedTotalQuestions !== undefined ? (
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <KangurSectionEyebrow as='span' className='pt-2 text-xs tracking-wide'>
            Question {questionIndex + 1} / {resolvedTotalQuestions}
          </KangurSectionEyebrow>
          <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end'>
            {showReadControl ? (
              <KangurLessonNarrator
                lesson={narratorLesson}
                lessonDocument={null}
                lessonContentRef={narrationSourceRef}
                readLabel='Read question'
              />
            ) : null}
            <KangurStatusChip accent='slate' size='sm'>
              {question.pointValue} {question.pointValue === 1 ? 'pt' : 'pts'}
            </KangurStatusChip>
          </div>
        </div>
      ) : null}

      {/* Prompt */}
      {promptContent}

      {/* Choices */}
      <div className={cn(choiceGrid ? 'grid gap-3 sm:grid-cols-2' : 'space-y-2')}>
        {question.choices.map((choice, index) => {
          const isSelected = selectedLabel === choice.label;
          const isChoiceCorrect = choice.label === question.correctChoiceLabel;
          const choiceLabel = choice.label;
          const choiceText = choice.text?.trim();
          const choiceDescription = choice.description?.trim();
          const accessibleChoiceLabel = choiceText
            ? `Odpowiedź ${choiceLabel}: ${choiceText}`
            : choiceDescription
              ? `Odpowiedź ${choiceLabel}: ${choiceDescription}`
              : `Odpowiedź ${choiceLabel}`;

          let accent: KangurAccent = 'slate';
          let emphasis: 'neutral' | 'accent' = 'neutral';
          let cardClassName = '[color:var(--kangur-page-text)]';

          if (isSelected && !showAnswer) {
            accent = 'amber';
            emphasis = 'accent';
            cardClassName = KANGUR_ACCENT_STYLES.amber.activeText;
          } else if (showAnswer && isChoiceCorrect) {
            accent = 'emerald';
            emphasis = 'accent';
            cardClassName = KANGUR_ACCENT_STYLES.emerald.activeText;
          } else if (showAnswer && isSelected && !isChoiceCorrect) {
            accent = 'rose';
            emphasis = 'accent';
            cardClassName = KANGUR_ACCENT_STYLES.rose.activeText;
          }

          return (
            <KangurTestChoiceCard
              choice={choice}
              choiceGrid={choiceGrid}
              contentId={questionContentId}
              isSelected={isSelected}
              key={choice.label}
              question={questionValue}
              showAnswer={answerRevealed}
            >
              <KangurAnswerChoiceCard
                accent={accent}
                aria-label={accessibleChoiceLabel}
                buttonClassName={cn(
                  'flex items-start gap-3 px-4 py-3 text-left text-sm font-semibold',
                  cardClassName,
                  choiceGrid && 'h-full min-h-[112px]'
                )}
                data-testid={`kangur-test-question-choice-${index}`}
                emphasis={emphasis}
                interactive={choiceInteractive}
                onClick={(): void => handleChoiceSelect(choice.label)}
                type='button'
              >
                <KangurTestChoiceCardBadge accent={accent} label={choice.label} />
                <KangurTestChoiceCardContent choice={choice} />
                <KangurTestChoiceCardFeedback
                  isChoiceCorrect={isChoiceCorrect}
                  isSelected={isSelected}
                  showAnswer={answerRevealed}
                />
              </KangurAnswerChoiceCard>
            </KangurTestChoiceCard>
          );
        })}
      </div>

      {/* Explanation */}
      {showAnswer && renderRichExplanation && richExplanationDocument ? (
        <div className='space-y-2'>
          <div className='text-xs font-bold uppercase tracking-wide text-indigo-600'>
            Explanation
          </div>
          <KangurLessonDocumentRenderer document={richExplanationDocument} renderMode='lesson' />
        </div>
      ) : null}
      {showAnswer && !renderRichExplanation && question.explanation ? (
        <KangurInfoCard accent='indigo' className='rounded-[22px]' padding='md' tone='accent'>
          <div className='mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600'>
            Explanation
          </div>
          <p className='text-sm text-indigo-900'>{question.explanation}</p>
        </KangurInfoCard>
      ) : null}

      {/* Result indicator */}
      {showAnswer && isAnswered ? (
        <KangurInfoCard
          accent={isCorrect ? 'emerald' : 'rose'}
          className={cn(
            'flex items-center gap-2 rounded-[22px] text-sm font-semibold',
            isCorrect ? 'text-emerald-700' : 'text-rose-700'
          )}
          padding='md'
          tone='accent'
        >
          {isCorrect ? (
            <>
              <CheckCircle className='size-4' />
              Correct! +{question.pointValue} pts
            </>
          ) : (
            <>
              <XCircle className='size-4' />
              Incorrect. Correct answer: {question.correctChoiceLabel}
            </>
          )}
        </KangurInfoCard>
      ) : null}
    </div>
  );
}
