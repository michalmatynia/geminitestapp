import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';

import { resolveKangurTutorSectionKnowledgeReference } from '@/features/kangur/ai-tutor-section-knowledge';
import { isPublishedKangurTestQuestion } from '@/features/kangur/test-questions';
import {
  useKangurAiTutorSessionSync,
  useOptionalKangurAiTutor,
} from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurTestSuiteRuntimeProvider } from '@/features/kangur/ui/context/KangurTestSuiteRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurPanelIntro,
  KangurProgressBar,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';

import { KangurTestQuestionRenderer } from './KangurTestQuestionRenderer';

type Props = {
  suite: KangurTestSuite;
  questions: KangurTestQuestion[];
  learnerId?: string | null;
  onFinish?: (score: number, maxScore: number, answers: Record<string, string>) => void;
};

export function KangurTestSuitePlayer({
  suite,
  questions,
  learnerId,
  onFinish,
}: Props): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const questionMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const tutor = useOptionalKangurAiTutor();
  const tutorContent = useKangurAiTutorContent();
  const publishedQuestions = useMemo(
    () => questions.filter((question) => isPublishedKangurTestQuestion(question)),
    [questions]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const { entry: emptyStateContent } = useKangurPageContentEntry('tests-empty-state');
  const { entry: summaryContent } = useKangurPageContentEntry('tests-summary');
  const emptyStateAnchorRef = useRef<HTMLDivElement | null>(null);
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);
  const summaryAnchorRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = publishedQuestions[currentIndex] ?? null;
  const selectedLabel = currentQuestion ? (answers[currentQuestion.id] ?? null) : null;
  const showAnswer = currentQuestion ? Boolean(revealedAnswers[currentQuestion.id]) : false;
  const isAnswered = selectedLabel !== null;
  const selectedChoiceText =
    currentQuestion && selectedLabel
      ? currentQuestion.choices.find((choice) => choice.label === selectedLabel)?.text ?? null
      : null;
  const selectedChoiceSelectionText =
    currentQuestion && selectedLabel && selectedChoiceText
      ? `Odpowiedź ${selectedLabel}: ${selectedChoiceText}`
      : null;
  const selectedChoiceFocusId =
    currentQuestion && selectedLabel
      ? `kangur-test-selection:${suite.id}:${currentQuestion.id}:${selectedLabel}`
      : null;
  const selectedChoiceKnowledgeReference = selectedChoiceFocusId
    ? resolveKangurTutorSectionKnowledgeReference({
      anchorId: selectedChoiceFocusId,
      contentId: suite.id,
      focusKind: 'selection',
    })
    : null;
  const correctChoiceText = currentQuestion
    ? currentQuestion.choices.find((choice) => choice.label === currentQuestion.correctChoiceLabel)?.text ??
      null
    : null;
  const reviewSummary =
    showAnswer && currentQuestion && selectedLabel
      ? [
        selectedChoiceText
          ? `Wybrana odpowiedź: ${selectedLabel} - ${selectedChoiceText}.`
          : `Wybrana odpowiedź: ${selectedLabel}.`,
        correctChoiceText
          ? `Poprawna odpowiedź: ${currentQuestion.correctChoiceLabel} - ${correctChoiceText}.`
          : `Poprawna odpowiedź: ${currentQuestion.correctChoiceLabel}.`,
      ]
        .filter(Boolean)
        .join(' ')
      : undefined;

  const score = publishedQuestions.reduce((total, q) => {
    if (answers[q.id] === q.correctChoiceLabel) return total + q.pointValue;
    return total;
  }, 0);
  const maxScore = publishedQuestions.reduce((total, q) => total + q.pointValue, 0);
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const totalQuestions = publishedQuestions.length;
  const activeTutorContext = useMemo(
    () => ({
      surface: 'test' as const,
      contentId: suite.id,
      title: suite.title,
      questionId: currentQuestion?.id,
      selectedChoiceLabel: selectedLabel ?? undefined,
      selectedChoiceText: selectedChoiceText ?? undefined,
      currentQuestion: currentQuestion?.prompt,
      description: reviewSummary,
      questionProgressLabel:
        totalQuestions > 0 ? `Pytanie ${currentIndex + 1}/${totalQuestions}` : undefined,
      answerRevealed: showAnswer,
    }),
    [
      currentIndex,
      currentQuestion?.id,
      currentQuestion?.prompt,
      currentQuestion?.correctChoiceLabel,
      currentQuestion?.choices,
      reviewSummary,
      selectedChoiceText,
      selectedLabel,
      showAnswer,
      suite.id,
      suite.title,
      totalQuestions,
    ]
  );
  const summaryTutorContext = useMemo(
    () => ({
      surface: 'test' as const,
      contentId: suite.id,
      title: suite.title,
      description: `Wynik końcowy: ${score}/${maxScore} pkt (${scorePercent}%).`,
      questionProgressLabel:
        totalQuestions > 0 ? `Ukończono ${totalQuestions}/${totalQuestions}` : undefined,
      answerRevealed: true,
    }),
    [maxScore, score, scorePercent, suite.id, suite.title, totalQuestions]
  );
  useKangurAiTutorSessionSync({
    learnerId: learnerId ?? null,
    sessionContext: finished ? summaryTutorContext : activeTutorContext,
  });
  useKangurTutorAnchor({
    id: `kangur-test-empty-state:${suite.id}`,
    kind: 'empty_state',
    ref: emptyStateAnchorRef,
    surface: 'test',
    enabled: totalQuestions === 0,
    priority: 76,
    metadata: {
      contentId: suite.id,
      label: 'Pusty zestaw testowy',
    },
  });
  useKangurTutorAnchor({
    id: `kangur-test-question:${suite.id}:${currentQuestion?.id ?? 'none'}`,
    kind: showAnswer ? 'review' : 'question',
    ref: questionAnchorRef,
    surface: 'test',
    enabled: Boolean(currentQuestion) && !finished,
    priority: showAnswer ? 78 : 82,
    metadata: {
      contentId: suite.id,
      label:
        totalQuestions > 0
          ? `Pytanie ${currentIndex + 1}/${totalQuestions}`
          : (currentQuestion?.prompt ?? null),
    },
  });
  useKangurTutorAnchor({
    id: `kangur-test-summary:${suite.id}`,
    kind: 'summary',
    ref: summaryAnchorRef,
    surface: 'test',
    enabled: finished,
    priority: 70,
    metadata: {
      contentId: suite.id,
      label: suite.title,
    },
  });

  const canAskAboutSelectedChoice =
    Boolean(tutor?.enabled) &&
    Boolean(currentQuestion) &&
    Boolean(selectedLabel) &&
    Boolean(selectedChoiceSelectionText) &&
    !showAnswer &&
    !finished;

  const handleSelect = (label: string): void => {
    if (!currentQuestion || showAnswer) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: label }));
  };

  const handleAskAboutSelectedChoice = async (): Promise<void> => {
    if (!tutor || !currentQuestion || !selectedLabel || !selectedChoiceSelectionText) {
      return;
    }

    tutor.setHighlightedText(selectedChoiceSelectionText);
    tutor.openChat();
    await tutor.sendMessage(tutorContent.guidedCallout.selectionRequestPrompt, {
      promptMode: 'selected_text',
      selectedText: selectedChoiceSelectionText,
      contentId: suite.id,
      focusKind: 'selection',
      focusId: selectedChoiceFocusId,
      focusLabel: selectedChoiceSelectionText,
      knowledgeReference: selectedChoiceKnowledgeReference,
      interactionIntent: 'explain',
      surface: 'test',
    });
  };

  const handleRevealAnswer = (): void => {
    if (!currentQuestion || !isAnswered || showAnswer) {
      return;
    }

    setRevealedAnswers((prev) => ({ ...prev, [currentQuestion.id]: true }));
  };

  const handleNext = (): void => {
    if (currentIndex < publishedQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setFinished(true);
      onFinish?.(score, maxScore, answers);
    }
  };

  const handlePrev = (): void => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleRestart = (): void => {
    setCurrentIndex(0);
    setAnswers({});
    setRevealedAnswers({});
    setFinished(false);
  };

  if (totalQuestions === 0) {
    return (
      <div ref={emptyStateAnchorRef}>
        <KangurEmptyState
          accent='slate'
          data-testid='kangur-test-suite-empty'
          description={
            emptyStateContent?.summary ??
            'Ten zestaw nie ma jeszcze aktywnych pytań testowych. Wróć później albo wybierz inny zestaw.'
          }
          padding='xl'
          title={emptyStateContent?.title ?? 'Brak opublikowanych pytań'}
        />
      </div>
    );
  }

  if (finished) {
    return (
      <>
        <KangurTestSuiteRuntimeProvider totalQuestions={totalQuestions}>
          <div ref={summaryAnchorRef}>
            <div className='space-y-6'>
              <KangurPanelIntro
                data-testid='kangur-test-suite-summary-copy'
                description={
                  summaryContent?.summary ??
                  'Sprawdź wynik końcowy i wróć do pytań, aby przeanalizować odpowiedzi.'
                }
                title={summaryContent?.title ?? 'Podsumowanie testu'}
                titleAs='h2'
                titleClassName='text-lg font-bold tracking-[-0.02em]'
              />
              <KangurSummaryPanel
                accent='indigo'
                align='center'
                data-testid='kangur-test-suite-summary'
                label='Wynik'
                padding='lg'
                title={`${score} / ${maxScore} pts`}
                tone='accent'
              >
                <div className='mt-1 text-lg font-semibold text-indigo-600'>{scorePercent}%</div>
                <div className='mt-2 text-sm text-indigo-500'>{suite.title}</div>
              </KangurSummaryPanel>

              <div className='space-y-4'>
                {publishedQuestions.map((question, index) => {
                  const selected = answers[question.id] ?? null;
                  return (
                    <KangurInfoCard
                      key={question.id}
                      accent='slate'
                      className='rounded-[24px]'
                      padding='md'
                    >
                      <KangurTestQuestionRenderer
                        contentId={suite.id}
                        question={question}
                        selectedLabel={selected}
                        onSelect={(): void => {}}
                        showAnswer={true}
                        questionIndex={index}
                        showReadControl={false}
                        showSectionIntro={false}
                      />
                    </KangurInfoCard>
                  );
                })}
              </div>

              <KangurButton
                type='button'
                onClick={handleRestart}
                fullWidth
                size='lg'
                variant='surface'
                data-doc-id='tests_suite_player'
              >
                <RotateCcw className='size-4' />
                Try again
              </KangurButton>
            </div>
          </div>
        </KangurTestSuiteRuntimeProvider>
      </>
    );
  }

  return (
    <>
      <KangurTestSuiteRuntimeProvider totalQuestions={totalQuestions}>
        <div className='space-y-4'>
          {/* Progress bar */}
          <div className='flex items-center gap-3'>
            <KangurProgressBar
              accent='indigo'
              className='flex-1'
              data-testid='kangur-test-suite-progress-bar'
              size='sm'
              value={((currentIndex + 1) / totalQuestions) * 100}
            />
            <span className='text-xs font-medium text-slate-500'>
              {currentIndex + 1}/{totalQuestions}
            </span>
          </div>

          {/* Question */}
          <AnimatePresence mode='wait'>
            <motion.div
              ref={questionAnchorRef}
              key={currentIndex}
              data-testid='kangur-test-question-anchor'
              {...questionMotionProps}
            >
              {currentQuestion ? (
                <KangurTestQuestionRenderer
                  contentId={suite.id}
                  question={currentQuestion}
                  selectedLabel={selectedLabel}
                  onSelect={handleSelect}
                  showAnswer={showAnswer}
                  questionIndex={currentIndex}
                  showSectionIntro
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className='flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between'>
            <KangurButton
              type='button'
              onClick={handlePrev}
              disabled={currentIndex === 0}
              size='sm'
              variant='surface'
              data-doc-id='tests_suite_player'
            >
              <ChevronLeft className='size-4' />
              Previous
            </KangurButton>

            <div className='flex flex-wrap items-center justify-end gap-2'>
              {canAskAboutSelectedChoice ? (
                <KangurButton
                  type='button'
                  onClick={(): void => {
                    void handleAskAboutSelectedChoice();
                  }}
                  disabled={tutor?.isLoading}
                  size='sm'
                  variant='surface'
                  data-doc-id='tests_suite_player'
                  data-testid='kangur-test-suite-selected-choice-tutor-cta'
                >
                  {tutorContent.common.askAboutSelectionLabel}
                </KangurButton>
              ) : null}

              {isAnswered ? (
                <KangurButton
                  type='button'
                  onClick={showAnswer ? handleNext : handleRevealAnswer}
                  size='sm'
                  variant='primary'
                  data-doc-id='tests_suite_player'
                >
                  {showAnswer
                    ? currentIndex < totalQuestions - 1
                      ? 'Next'
                      : 'Finish'
                    : 'Check answer'}
                  <ChevronRight className='size-4' />
                </KangurButton>
              ) : (
                <div className='text-xs text-slate-400'>Select an answer to continue</div>
              )}
            </div>
          </div>
        </div>
      </KangurTestSuiteRuntimeProvider>
    </>
  );
}
