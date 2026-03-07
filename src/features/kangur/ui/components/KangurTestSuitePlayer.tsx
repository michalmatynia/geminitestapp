'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KangurTestQuestionRenderer } from './KangurTestQuestionRenderer';

type Props = {
  suite: KangurTestSuite;
  questions: KangurTestQuestion[];
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

function ExamSummary({ suite, questions, answers, score, maxScore, onRestart }: SummaryProps): React.JSX.Element {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div className='space-y-6'>
      <div className='rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-center'>
        <div className='text-3xl font-extrabold text-indigo-700'>
          {score} / {maxScore} pts
        </div>
        <div className='mt-1 text-lg font-semibold text-indigo-600'>{pct}%</div>
        <div className='mt-2 text-sm text-indigo-500'>{suite.title}</div>
      </div>

      <div className='space-y-4'>
        {questions.map((q, i) => {
          const selected = answers[q.id] ?? null;
          return (
            <div key={q.id} className='rounded-xl border border-border/50 p-4'>
              <KangurTestQuestionRenderer
                question={q}
                selectedLabel={selected}
                onSelect={(): void => {}}
                showAnswer={true}
                questionIndex={i}
                totalQuestions={questions.length}
              />
            </div>
          );
        })}
      </div>

      <KangurButton type='button' onClick={onRestart} fullWidth size='lg' variant='secondary'>
        <RotateCcw className='size-4' />
        Try again
      </KangurButton>
    </div>
  );
}

export function KangurTestSuitePlayer({ suite, questions, onFinish }: Props): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);

  const currentQuestion = questions[currentIndex] ?? null;
  const selectedLabel = currentQuestion ? (answers[currentQuestion.id] ?? null) : null;
  const isAnswered = selectedLabel !== null;

  const score = questions.reduce((total, q) => {
    if (answers[q.id] === q.correctChoiceLabel) return total + q.pointValue;
    return total;
  }, 0);
  const maxScore = questions.reduce((total, q) => total + q.pointValue, 0);

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

  if (questions.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground'>
        This test suite has no questions yet.
      </div>
    );
  }

  if (finished) {
    return (
      <ExamSummary
        suite={suite}
        questions={questions}
        answers={answers}
        score={score}
        maxScore={maxScore}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className='space-y-4'>
      {/* Progress bar */}
      <div className='flex items-center gap-3'>
        <div className='flex-1 rounded-full bg-gray-200 h-1.5'>
          <div
            className='h-1.5 rounded-full bg-indigo-500 transition-all'
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className='text-xs font-medium text-gray-500'>
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode='wait'>
        <motion.div
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
              totalQuestions={questions.length}
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
          variant='secondary'
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
          >
            {currentIndex < questions.length - 1 ? 'Next' : 'Finish'}
            <ChevronRight className='size-4' />
          </KangurButton>
        ) : (
          <div className='text-xs text-gray-400'>Select an answer to continue</div>
        )}
      </div>
    </div>
  );
}
