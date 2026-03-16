'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';

import {
  Q1Illustration,
  Q2Illustration,
  Q3Illustration,
  Q4Illustration,
  Q5Illustration,
  Q6Illustration,
  Q7Illustration,
  Q8Illustration,
  Q9Illustration,
  Q10Illustration,
  Q11Illustration,
  Q15Illustration,
  Q16Illustration,
} from '@/features/kangur/ui/components/KangurIllustrations';
import { KangurAnswerChoiceBadge } from '@/features/kangur/ui/components/KangurAnswerChoiceBadge';
import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';
import {
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import { useKangurGameContext } from '@/features/kangur/ui/context/KangurGameContext';
import {
  KangurButton,
  KangurInfoCard,
  KangurInlineFallback,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { getKangurQuestions } from '@/features/kangur/ui/services/kangur-questions';
import type { KangurExamQuestion, KangurQuestionChoice } from '@/features/kangur/ui/types';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { cn } from '@/features/kangur/shared/utils';

type IllustrationComponent = () => React.JSX.Element;

type ExamQuestionProps = {
  q: KangurExamQuestion;
  qIndex: number;
  total: number;
  selected: KangurQuestionChoice | undefined;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  prevDisabled: boolean;
  nextDisabled: boolean;
  onSelect: (choice: KangurQuestionChoice) => void;
};

type ExamSummaryProps = {
  questions: KangurExamQuestion[];
  answers: Record<string, KangurQuestionChoice | undefined>;
};

type ExamNavigationProps = {
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  ariaLabel?: string;
  progressLabel?: string;
  progressAriaLabel?: string;
  progressTestId?: string;
};

const ILLUSTRATIONS: Record<string, IllustrationComponent | undefined> = {
  '2024_1': Q1Illustration,
  '2024_2': Q2Illustration,
  '2024_3': Q3Illustration,
  '2024_4': Q4Illustration,
  '2024_5': Q5Illustration,
  '2024_6': Q6Illustration,
  '2024_7': Q7Illustration,
  '2024_8': Q8Illustration,
  '2024_4pt_9': Q9Illustration,
  '2024_4pt_10': Q10Illustration,
  '2024_4pt_11': Q11Illustration,
  '2024_4pt_15': Q15Illustration,
  '2024_4pt_16': Q16Illustration,
};

const POINT_LABELS: Record<string, string> = {
  '2024_1': '3 pkt',
  '2024_2': '3 pkt',
  '2024_3': '3 pkt',
  '2024_4': '3 pkt',
  '2024_5': '3 pkt',
  '2024_6': '3 pkt',
  '2024_7': '3 pkt',
  '2024_8': '3 pkt',
  '2024_4pt_9': '4 pkt',
  '2024_4pt_10': '4 pkt',
  '2024_4pt_11': '4 pkt',
  '2024_4pt_12': '4 pkt',
  '2024_4pt_13': '4 pkt',
  '2024_4pt_14': '4 pkt',
  '2024_4pt_15': '4 pkt',
  '2024_4pt_16': '4 pkt',
  '2024_5pt_17': '5 pkt',
  '2024_5pt_18': '5 pkt',
  '2024_5pt_19': '5 pkt',
  '2024_5pt_20': '5 pkt',
  '2024_5pt_21': '5 pkt',
  '2024_5pt_22': '5 pkt',
  '2024_5pt_23': '5 pkt',
  '2024_5pt_24': '5 pkt',
};

function ExamNavigation({
  prevDisabled,
  nextDisabled,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  ariaLabel = 'Nawigacja w teście Kangur',
  progressLabel,
  progressAriaLabel,
  progressTestId,
}: ExamNavigationProps): React.JSX.Element {
  const buttonClassName =
    'justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-35';

  return (
    <div className='grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2'>
      <div />
      <nav className='flex items-center justify-center gap-2' aria-label={ariaLabel}>
        <KangurButton
          onClick={prevDisabled ? undefined : onPrev}
          disabled={prevDisabled}
          className={buttonClassName}
          size='sm'
          type='button'
          variant='surface'
          aria-label={prevLabel}
          title={prevLabel}
        >
          <ChevronLeft className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
          <span className='sr-only'>{prevLabel}</span>
        </KangurButton>
        <KangurButton
          onClick={nextDisabled ? undefined : onNext}
          disabled={nextDisabled}
          className={buttonClassName}
          size='sm'
          type='button'
          variant='surface'
          aria-label={nextLabel}
          title={nextLabel}
        >
          <span className='sr-only'>{nextLabel}</span>
          <ChevronRight className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        </KangurButton>
      </nav>
      <div className='flex justify-end' aria-live='polite' aria-atomic='true'>
        {progressLabel ? (
          <KangurStatusChip
            accent='amber'
            data-testid={progressTestId}
            aria-label={progressAriaLabel ?? progressLabel}
            size='sm'
          >
            {progressLabel}
          </KangurStatusChip>
        ) : null}
      </div>
    </div>
  );
}

function ExamQuestion({
  q,
  qIndex,
  total,
  selected,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  prevDisabled,
  nextDisabled,
  onSelect,
}: ExamQuestionProps): React.JSX.Element {
  const Illustration = ILLUSTRATIONS[q.id];
  const pointLabel = POINT_LABELS[q.id];
  const questionNumber = qIndex + 1;
  const progressValueText = `Pytanie ${questionNumber} z ${total}`;
  const headingId = useId();
  const descriptionId = useId();
  const narrationSourceRef = useRef<HTMLDivElement | null>(null);
  const narratorLesson = useMemo<
    Pick<KangurLesson, 'id' | 'title' | 'description' | 'contentMode'>
  >(
    () => ({
      id: `kangur-exam-question:${q.id}`,
      title: `Pytanie ${questionNumber}`,
      description: q.question,
      contentMode: 'component',
    }),
    [q.id, q.question, questionNumber]
  );
  const narrationText = useMemo(
    () =>
      [
        `Pytanie ${questionNumber} z ${total}.`,
        q.question,
        ...q.choices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}.`),
      ].join(' '),
    [q.choices, q.question, questionNumber, total]
  );
  const handleChoiceSelect = (choice: KangurQuestionChoice): void => {
    onSelect(choice);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <div aria-hidden='true' className='sr-only' ref={narrationSourceRef}>
        {narrationText}
      </div>
      <ExamNavigation
        ariaLabel='Nawigacja pytań Kangur Matematyczny'
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
        prevLabel={prevLabel}
        nextLabel={nextLabel}
        onPrev={onPrev}
        onNext={onNext}
        progressLabel={`${questionNumber}/${total}`}
        progressAriaLabel={progressValueText}
        progressTestId='kangur-exam-progress-pill'
      />

      <KangurInfoCard
        className='flex flex-col kangur-panel-gap rounded-[24px]'
        data-testid='kangur-exam-question-shell'
        padding='lg'
        tone='neutral'
      >
        <div className='mb-1 flex flex-col kangur-panel-gap sm:flex-row sm:items-start sm:justify-between'>
          <p
            id={headingId}
            className='break-words text-sm font-bold uppercase tracking-wide text-orange-500'
          >
            Pytanie {questionNumber}
          </p>
          <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end'>
            <KangurLessonNarrator
              lesson={narratorLesson}
              lessonDocument={null}
              lessonContentRef={narrationSourceRef}
              readLabel='Czytaj pytanie'
              pauseLabel='Pauza'
              resumeLabel='Wznów'
              loadingLabel='Przygotowywanie...'
            />
            {pointLabel ? (
              <KangurStatusChip
                accent='amber'
                data-testid='kangur-exam-question-point-chip'
                size='sm'
              >
                {pointLabel}
              </KangurStatusChip>
            ) : null}
          </div>
        </div>
        <p
          id={descriptionId}
          className='break-words font-semibold leading-relaxed [color:var(--kangur-page-text)]'
        >
          {q.question}
        </p>
        {Illustration && (
          <KangurInfoCard
            accent='slate'
            className='rounded-[22px]'
            data-testid='kangur-exam-question-illustration'
            padding='sm'
            tone='muted'
          >
            <Illustration />
          </KangurInfoCard>
        )}
      </KangurInfoCard>

      <div
        aria-describedby={descriptionId}
        aria-labelledby={headingId}
        className='flex flex-col gap-2'
        role='group'
      >
        {q.choices.map((choice, index) => {
          const isSelected = selected === choice;
          const accent: KangurAccent = isSelected ? 'amber' : 'slate';
          const emphasis = isSelected ? 'accent' : 'neutral';

          return (
            <KangurAnswerChoiceCard
              accent={accent}
              aria-label={`Odpowiedź ${String.fromCharCode(65 + index)}. ${String(choice)}`}
              aria-pressed={isSelected}
              buttonClassName={cn(
                'flex items-center kangur-panel-gap px-4 py-3 font-semibold',
                isSelected
                  ? KANGUR_ACCENT_STYLES.amber.activeText
                  : '[color:var(--kangur-page-text)]'
              )}
              data-testid={`kangur-exam-choice-${index}`}
              emphasis={emphasis}
              hoverScale={1.02}
              key={`${String(choice)}-${index}`}
              onClick={() => handleChoiceSelect(choice)}
              tapScale={0.98}
              type='button'
            >
              <KangurAnswerChoiceBadge
                className={isSelected ? KANGUR_ACCENT_STYLES.amber.badge : KANGUR_ACCENT_STYLES.slate.badge}
              >
                {String.fromCharCode(65 + index)}
              </KangurAnswerChoiceBadge>
              <span className='min-w-0 flex-1 break-words'>{choice}</span>
            </KangurAnswerChoiceCard>
          );
        })}
      </div>
    </section>
  );
}

function ExamSummary({ questions, answers }: ExamSummaryProps): React.JSX.Element {
  const { onBack } = useKangurGameContext();
  const [reviewing, setReviewing] = useState<number | null>(null);
  const questionCount = questions.length;
  const score = questions.reduce(
    (acc, question) => acc + (answers[question.id] === question.answer ? 1 : 0),
    0
  );
  const pct = Math.round((score / questionCount) * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🌟' : pct >= 40 ? '👍' : '💪';
  const reviewQuestionCount = questionCount;
  const summaryTitle = `Wynik: ${score}/${questionCount}`;

  if (reviewing !== null) {
    const question = questions[reviewing];
    if (!question) {
      return (
        <KangurInlineFallback
          data-testid='kangur-exam-review-empty'
          title='Brak pytania do podglądu.'
        />
      );
    }
    const userAnswer = answers[question.id];
    const Illustration = ILLUSTRATIONS[question.id];
    const pointLabel = POINT_LABELS[question.id];
    const handleExitReview = (): void => {
      setReviewing(null);
    };
    const handleReviewPreviousQuestion = (): void => {
      setReviewing(Math.max(0, reviewing - 1));
    };
    const handleReviewNextQuestion = (): void => {
      setReviewing(Math.min(reviewQuestionCount - 1, reviewing + 1));
    };

    return (
      <div className={`w-full flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <ExamNavigation
          ariaLabel='Nawigacja podglądu pytań'
          prevDisabled={reviewing === 0}
          nextDisabled={reviewing === reviewQuestionCount - 1}
          prevLabel='Poprzednie pytanie w podglądzie'
          nextLabel='Następne pytanie w podglądzie'
          onPrev={handleReviewPreviousQuestion}
          onNext={handleReviewNextQuestion}
          progressLabel={`${reviewing + 1}/${reviewQuestionCount}`}
          progressAriaLabel={`Pytanie ${reviewing + 1} z ${reviewQuestionCount}`}
        />
        <div className='flex items-center justify-between'>
          <KangurButton
            onClick={handleExitReview}
            size='sm'
            type='button'
            variant='surface'
          >
            <ChevronLeft className='w-4 h-4' /> Podsumowanie
          </KangurButton>
          <span className='self-center break-words text-xs font-bold [color:var(--kangur-page-muted-text)]'>
            {reviewing + 1}/{reviewQuestionCount}
          </span>
        </div>

        <KangurInfoCard
          className='flex flex-col kangur-panel-gap rounded-[24px]'
          data-testid='kangur-exam-review-shell'
          padding='lg'
          tone='neutral'
        >
          <div className='flex items-center justify-between'>
            <p className='break-words text-sm font-bold uppercase tracking-wide text-orange-500'>
              Pytanie {reviewing + 1}
            </p>
            {pointLabel ? (
              <KangurStatusChip
                accent='amber'
                data-testid='kangur-exam-review-point-chip'
                size='sm'
              >
                {pointLabel}
              </KangurStatusChip>
            ) : null}
          </div>
          <p className='break-words font-semibold leading-relaxed [color:var(--kangur-page-text)]'>
            {question.question}
          </p>
          {Illustration && (
            <KangurInfoCard
              accent='slate'
              className='rounded-[22px]'
              data-testid='kangur-exam-review-illustration'
              padding='sm'
              tone='muted'
            >
              <Illustration />
            </KangurInfoCard>
          )}
        </KangurInfoCard>

        <div className='flex flex-col gap-2'>
          {question.choices.map((choice, index) => {
            let accent: KangurAccent = 'slate';
            let emphasis: 'neutral' | 'accent' = 'neutral';
            let state: 'default' | 'muted' = 'muted';
            let style = '';
            let badgeClassName = KANGUR_ACCENT_STYLES.slate.badge;
            if (choice === question.answer) {
              accent = 'emerald';
              emphasis = 'accent';
              state = 'default';
              style = KANGUR_ACCENT_STYLES.emerald.activeText;
              badgeClassName = KANGUR_ACCENT_STYLES.emerald.badge;
            } else if (choice === userAnswer) {
              accent = 'rose';
              emphasis = 'accent';
              state = 'default';
              style = KANGUR_ACCENT_STYLES.rose.activeText;
              badgeClassName = KANGUR_ACCENT_STYLES.rose.badge;
            }
            return (
              <KangurAnswerChoiceCard
                accent={accent}
                aria-disabled='true'
                buttonClassName={cn(
                  'flex items-center kangur-panel-gap px-4 py-3 font-semibold',
                  style
                )}
                data-testid={`kangur-exam-review-choice-${index}`}
                emphasis={emphasis}
                interactive={false}
                key={`${String(choice)}-${index}`}
                onClick={() => undefined}
                state={state}
                type='button'
              >
                <KangurAnswerChoiceBadge className={badgeClassName}>
                  {String.fromCharCode(65 + index)}
                </KangurAnswerChoiceBadge>
                <span className='min-w-0 flex-1 break-words'>{choice}</span>
                {choice === question.answer && (
                  <CheckCircle className='w-4 h-4 text-green-600 ml-auto flex-shrink-0' />
                )}
                {choice === userAnswer && choice !== question.answer && (
                  <XCircle className='w-4 h-4 text-red-500 ml-auto flex-shrink-0' />
                )}
              </KangurAnswerChoiceCard>
            );
          })}
        </div>

        {question.explanation && (
          <KangurInfoCard
            accent='sky'
            className='rounded-[22px] text-sm break-words'
            data-testid='kangur-exam-review-explanation'
            padding='sm'
            tone='accent'
          >
            💡 {question.explanation}
          </KangurInfoCard>
        )}

        {!userAnswer && (
          <KangurInfoCard
            accent='slate'
            className='rounded-[22px] text-center text-sm'
            data-testid='kangur-exam-review-skipped'
            padding='sm'
            tone='muted'
          >
            ⏭️ Pytanie pominięte
          </KangurInfoCard>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <div className='flex w-full justify-center'>
        <KangurButton
          onClick={onBack}
          className='w-full sm:w-auto'
          size='lg'
          type='button'
          variant='surface'
        >
          Wróć do menu
        </KangurButton>
      </div>
      <KangurPracticeGameSummary dataTestId='kangur-exam-summary-shell'>
        <KangurPracticeGameSummaryEmoji emoji={emoji} dataTestId='kangur-exam-summary-emoji' />
        <KangurPracticeGameSummaryTitle
          accent='amber'
          title={summaryTitle}
        />
        <KangurPracticeGameSummaryProgress
          accent='amber'
          ariaLabel='Dokładność odpowiedzi w teście Kangur'
          ariaValueText={`${pct}% poprawnych odpowiedzi`}
          dataTestId='kangur-exam-summary-progress-bar'
          percent={pct}
        />
        <p className='break-words text-sm [color:var(--kangur-page-muted-text)]'>
          {pct}% poprawnych odpowiedzi
        </p>
        <KangurPracticeGameSummaryMessage className='text-sm'>
          {pct === 100
            ? 'Idealny wynik! Jesteś mistrzem Kangura! 🦘'
            : pct >= 70
              ? 'Świetnie! Gotowy/a na konkurs!'
              : pct >= 40
                ? 'Dobra robota! Ćwicz dalej!'
                : 'Nie poddawaj się! Spróbuj jeszcze raz!'}
        </KangurPracticeGameSummaryMessage>
      </KangurPracticeGameSummary>

      <p className='break-words text-center text-sm font-semibold [color:var(--kangur-page-muted-text)]'>
        Kliknij pytanie, aby zobaczyć rozwiązanie:
      </p>

      <div
        aria-label='Przegląd pytań testowych'
        className='grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4'
        role='list'
      >
        {questions.map((question, index) => {
          const userAnswer = answers[question.id];
          const correct = userAnswer === question.answer;
          const skipped = !userAnswer;
          const accent: KangurAccent = skipped ? 'slate' : correct ? 'emerald' : 'rose';
          return (
            <KangurAnswerChoiceCard
              accent={accent}
              aria-label={`Pytanie ${index + 1}. ${skipped ? 'Pominięte.' : correct ? 'Poprawna odpowiedź.' : `Niepoprawna odpowiedź ${String(userAnswer)}.`} Kliknij, aby zobaczyć rozwiązanie.`}
              buttonClassName={cn(
                'flex min-h-[84px] flex-col items-center gap-1 p-2 text-center sm:min-h-[92px]',
                skipped
                  ? KANGUR_ACCENT_STYLES.slate.activeText
                  : correct
                    ? KANGUR_ACCENT_STYLES.emerald.activeText
                    : KANGUR_ACCENT_STYLES.rose.activeText
              )}
              data-testid={`kangur-exam-summary-question-${index}`}
              emphasis='accent'
              hoverScale={1.08}
              key={question.id}
              onClick={() => setReviewing(index)}
              tapScale={0.95}
              type='button'
              wrapperRole='listitem'
            >
              <span className='text-xs font-bold [color:var(--kangur-page-muted-text)]'>
                #{index + 1}
              </span>
              {skipped ? (
                <span className='text-sm'>➖</span>
              ) : correct ? (
                <CheckCircle className='w-4 h-4 text-green-600' />
              ) : (
                <XCircle className='w-4 h-4 text-red-500' />
              )}
              <span
                className={`text-[10px] font-bold ${
                  skipped
                    ? '[color:var(--kangur-page-muted-text)]'
                    : correct
                      ? 'text-green-700'
                      : 'text-red-600'
                }`}
              >
                {skipped ? 'pom.' : correct ? '✓' : userAnswer}
              </span>
            </KangurAnswerChoiceCard>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function KangurExam(): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const questionMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const { mode } = useKangurGameContext();
  const questions = getKangurQuestions(mode);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, KangurQuestionChoice | undefined>>({});
  const [finished, setFinished] = useState(false);

  const handleSelect = (choice: KangurQuestionChoice): void => {
    const activeQuestion = questions[current];
    if (!activeQuestion) {
      return;
    }
    setAnswers((previous) => ({ ...previous, [activeQuestion.id]: choice }));
  };

  const handleNext = (): void => {
    if (current + 1 < questions.length) {
      setCurrent((previous) => previous + 1);
    } else {
      setFinished(true);
    }
  };

  const handlePrev = (): void => {
    if (current > 0) {
      setCurrent((previous) => previous - 1);
    }
  };

  if (finished) {
    return <ExamSummary questions={questions} answers={answers} />;
  }

  const activeQuestion = questions[current];
  if (!activeQuestion) {
    return <ExamSummary questions={questions} answers={answers} />;
  }
  const selected = answers[activeQuestion.id];

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={current}
        {...questionMotionProps}
        className={`w-full flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
      >
        <ExamQuestion
          q={activeQuestion}
          qIndex={current}
          total={questions.length}
          selected={selected}
          onPrev={handlePrev}
          onNext={handleNext}
          prevLabel={current === 0 ? 'Brak poprzedniego pytania' : 'Poprzednie pytanie'}
          nextLabel={current === questions.length - 1 ? 'Zakończ test' : 'Następne pytanie'}
          prevDisabled={current === 0}
          nextDisabled={questions.length === 0}
          onSelect={handleSelect}
        />
        {!selected && (
          <p className='break-words text-center text-xs [color:var(--kangur-page-muted-text)]'>
            Możesz pominąć pytanie i wrócić do niego później
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
