'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';

import { isPublishedKangurTestQuestion } from '@/features/kangur/test-questions';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
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
  const publishedQuestions = useMemo(
    () => questions.filter((question) => isPublishedKangurTestQuestion(question)),
    [questions]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);
  const { entry: emptyStateContent } = useKangurPageContentEntry('tests-empty-state');
  const { entry: summaryContent } = useKangurPageContentEntry('tests-summary');
  const emptyStateAnchorRef = useRef<HTMLDivElement | null>(null);
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);
  const summaryAnchorRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = publishedQuestions[currentIndex] ?? null;
  const selectedLabel = currentQuestion ? (answers[currentQuestion.id] ?? null) : null;
  const isAnswered = selectedLabel !== null;

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
      currentQuestion: currentQuestion?.prompt,
      questionProgressLabel:
        totalQuestions > 0 ? `Pytanie ${currentIndex + 1}/${totalQuestions}` : undefined,
      answerRevealed: showAnswer,
    }),
    [
      currentIndex,
      currentQuestion?.id,
      currentQuestion?.prompt,
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
      questionProgressLabel:
        totalQuestions > 0 ? `Ukonczono ${totalQuestions}/${totalQuestions}` : undefined,
      answerRevealed: true,
    }),
    [suite.id, suite.title, totalQuestions]
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

  const handleSelect = (label: string): void => {
    if (!currentQuestion || showAnswer) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: label }));
    setShowAnswer(true);
  };

  const handleNext = (): void => {
    setShowAnswer(false);
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
      setShowAnswer(Boolean(answers[publishedQuestions[currentIndex - 1]?.id ?? '']));
    }
  };

  const handleRestart = (): void => {
    setCurrentIndex(0);
    setAnswers({});
    setShowAnswer(false);
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
            'Ten zestaw nie ma jeszcze aktywnych pytan testowych. Wroc pozniej albo wybierz inny zestaw.'
          }
          padding='xl'
          title={emptyStateContent?.title ?? 'Brak opublikowanych pytan'}
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
                  'Sprawdz wynik koncowy i wroc do pytan, aby przeanalizowac odpowiedzi.'
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
          <div className='flex items-center justify-between pt-2'>
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

            {isAnswered ? (
              <KangurButton
                type='button'
                onClick={handleNext}
                size='sm'
                variant='primary'
                data-doc-id='tests_suite_player'
              >
                {currentIndex < totalQuestions - 1 ? 'Next' : 'Finish'}
                <ChevronRight className='size-4' />
              </KangurButton>
            ) : (
              <div className='text-xs text-slate-400'>Select an answer to continue</div>
            )}
          </div>
        </div>
      </KangurTestSuiteRuntimeProvider>
    </>
  );
}
