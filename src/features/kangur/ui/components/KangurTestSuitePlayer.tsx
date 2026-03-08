'use client';

import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurProgressBar,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { KangurTestSuiteRuntimeProvider } from '@/features/kangur/ui/context/KangurTestSuiteRuntimeContext';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { KangurTestQuestionRenderer } from './KangurTestQuestionRenderer';

type Props = {
  suite: KangurTestSuite;
  questions: KangurTestQuestion[];
  learnerId?: string | null;
  onFinish?: (score: number, maxScore: number, answers: Record<string, string>) => void;
};

type SummaryProps = {
  suite: KangurTestSuite;
  questions: KangurTestQuestion[];
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  onRestart: () => void;
};

function ExamSummary({
  suite,
  questions,
  answers,
  score,
  maxScore,
  onRestart,
}: SummaryProps): React.JSX.Element {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div className='space-y-6'>
      <KangurSummaryPanel
        accent='indigo'
        align='center'
        data-testid='kangur-test-suite-summary'
        label='Wynik'
        padding='lg'
        title={`${score} / ${maxScore} pts`}
        tone='accent'
      >
        <div className='mt-1 text-lg font-semibold text-indigo-600'>{pct}%</div>
        <div className='mt-2 text-sm text-indigo-500'>{suite.title}</div>
      </KangurSummaryPanel>

      <div className='space-y-4'>
        {questions.map((q, i) => {
          const selected = answers[q.id] ?? null;
          return (
            <KangurInfoCard key={q.id} accent='slate' className='rounded-[24px]' padding='md'>
              <KangurTestQuestionRenderer
                question={q}
                selectedLabel={selected}
                onSelect={(): void => {}}
                showAnswer={true}
                questionIndex={i}
              />
            </KangurInfoCard>
          );
        })}
      </div>

      <KangurButton
        type='button'
        onClick={onRestart}
        fullWidth
        size='lg'
        variant='surface'
        data-doc-id='tests_suite_player'
      >
        <RotateCcw className='size-4' />
        Try again
      </KangurButton>
    </div>
  );
}

export function KangurTestSuitePlayer({ suite, questions, learnerId, onFinish }: Props): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);
  const summaryAnchorRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const selectedLabel = currentQuestion ? (answers[currentQuestion.id] ?? null) : null;
  const isAnswered = selectedLabel !== null;

  const score = questions.reduce((total, q) => {
    if (answers[q.id] === q.correctChoiceLabel) return total + q.pointValue;
    return total;
  }, 0);
  const maxScore = questions.reduce((total, q) => total + q.pointValue, 0);
  const totalQuestions = questions.length;
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
        totalQuestions > 0 ? `Pytanie ${currentIndex + 1}/${totalQuestions}` : currentQuestion?.prompt ?? null,
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
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setFinished(true);
      onFinish?.(score, maxScore, answers);
    }
  };

  const handlePrev = (): void => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setShowAnswer(Boolean(answers[questions[currentIndex - 1]?.id ?? '']));
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
      <KangurEmptyState
        accent='slate'
        data-testid='kangur-test-suite-empty'
        padding='xl'
        title='This test suite has no questions yet.'
      />
    );
  }

  if (finished) {
    return (
      <>
        <KangurAiTutorSessionSync
          learnerId={learnerId ?? null}
          sessionContext={summaryTutorContext}
        />
        <KangurTestSuiteRuntimeProvider totalQuestions={totalQuestions}>
          <div ref={summaryAnchorRef}>
            <ExamSummary
              suite={suite}
              questions={questions}
              answers={answers}
              score={score}
              maxScore={maxScore}
              onRestart={handleRestart}
            />
          </div>
        </KangurTestSuiteRuntimeProvider>
      </>
    );
  }

  return (
    <>
      <KangurAiTutorSessionSync
        learnerId={learnerId ?? null}
        sessionContext={activeTutorContext}
      />
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentQuestion ? (
                <KangurTestQuestionRenderer
                  question={currentQuestion}
                  selectedLabel={selectedLabel}
                  onSelect={handleSelect}
                  showAnswer={showAnswer}
                  questionIndex={currentIndex}
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
