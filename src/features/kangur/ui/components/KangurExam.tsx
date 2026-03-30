'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, ChevronLeft, Printer, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { renderKangurLessonNavigationIconButton } from '@/features/kangur/ui/components/KangurLessonNavigationIconButton';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';
import {
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  getKangurMiniGameAccuracyText,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { useKangurGameContext } from '@/features/kangur/ui/context/KangurGameContext';
import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import {
  KangurButton,
  KangurInfoCard,
  KangurInlineFallback,
  KangurPanelRow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import { getKangurQuestions } from '@/features/kangur/ui/services/kangur-questions';
import type { KangurExamQuestion, KangurQuestionChoice } from '@/features/kangur/ui/types';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { cn } from '@/features/kangur/shared/utils';
import { ExamNavigation } from './ExamNavigation';
import { ExamNavigationProvider, useExamNavigation } from '@/features/kangur/ui/context/ExamNavigationContext';

type IllustrationComponent = () => React.JSX.Element;

type ExamQuestionProps = {
  q: KangurExamQuestion;
  qIndex: number;
  total: number;
  selected: KangurQuestionChoice | undefined;
  onSelect: (choice: KangurQuestionChoice) => void;
};

type ExamSummaryProps = {
  questions: KangurExamQuestion[];
  answers: Record<string, KangurQuestionChoice | undefined>;
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

function ExamQuestion({
  q,
  qIndex,
  total,
  selected,
  onSelect,
}: ExamQuestionProps): React.JSX.Element {
  const {
    prevDisabled,
    nextDisabled,
    prevLabel,
    nextLabel,
    onPrev,
    onNext,
    progressLabel,
    progressAriaLabel,
  } = useExamNavigation();
  const lessonNavigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const lessonPrint = useOptionalKangurLessonPrint();

  const Illustration = ILLUSTRATIONS[q.id];
  const pointLabel = POINT_LABELS[q.id];
  const questionNumber = qIndex + 1;
  const headingId = useId();
  const descriptionId = useId();
  const printPanelId = `kangur-exam-question-${q.id}`;
  const printPanelTitle = `Pytanie ${questionNumber}`;
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
      className={`mx-auto flex w-full max-w-4xl flex-col items-center text-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
      data-kangur-print-panel='true'
      data-kangur-print-paged-panel='true'
      data-kangur-print-preferred-target='true'
      data-kangur-print-panel-id={printPanelId}
      data-kangur-print-panel-title={printPanelTitle}
      data-testid='kangur-exam-question-print-panel'
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
        onPrintPanel={
          lessonPrint?.onPrintPanel
            ? () => lessonPrint.onPrintPanel?.(printPanelId)
            : undefined
        }
        printLabel={lessonNavigationTranslations('printPanel')}
        progressLabel={progressLabel}
        progressAriaLabel={progressAriaLabel}
        progressTestId='kangur-exam-progress-pill'
      />

      <KangurInfoCard
        className='flex w-full flex-col items-center text-center kangur-panel-gap rounded-[24px]'
        data-testid='kangur-exam-question-shell'
        padding='lg'
        tone='neutral'
      >
        <KangurPanelRow className='mb-1 items-center justify-center text-center'>
          <p
            id={headingId}
            className='break-words text-center text-sm font-bold uppercase tracking-wide text-orange-500'
          >
            Pytanie {questionNumber}
          </p>
          <div className='flex w-full flex-wrap items-center justify-center gap-2 text-center'>
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
        </KangurPanelRow>
        <p
          id={descriptionId}
          className='mx-auto max-w-2xl break-words text-center font-semibold leading-relaxed [color:var(--kangur-page-text)]'
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
        className={cn(KANGUR_STACK_TIGHT_CLASSNAME, 'w-full max-w-2xl')}
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
                'flex items-center justify-start kangur-panel-gap px-4 py-3 text-left font-semibold',
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
                <span className='min-w-0 flex-1 break-words text-left'>{choice}</span>
              </KangurAnswerChoiceCard>
            );
          })}
      </div>
    </section>
  );
}

function ExamSummary({ questions, answers }: ExamSummaryProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const lessonNavigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const { onBack } = useKangurGameContext();
  const lessonPrint = useOptionalKangurLessonPrint();
  const isCoarsePointer = useKangurCoarsePointer();
  const [reviewing, setReviewing] = useState<number | null>(null);
  const questionCount = questions.length;
  const score = questions.reduce(
    (acc, question) => acc + (answers[question.id] === question.answer ? 1 : 0),
    0
  );
  const pct = Math.round((score / questionCount) * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🌟' : pct >= 40 ? '👍' : '💪';
  const reviewQuestionCount = questionCount;
  const summaryTitle = getKangurMiniGameScoreLabel(translations, score, questionCount);
  const summaryPanelId = 'kangur-exam-summary';
  const printPanelLabel = lessonNavigationTranslations('printPanel');
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

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
    const reviewPanelId = `kangur-exam-review-${question.id}`;
    const reviewPanelTitle = `Pytanie ${reviewing + 1}`;

    return (
      <div
        className={`mx-auto flex w-full max-w-4xl flex-col items-center text-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
        data-kangur-print-panel='true'
        data-kangur-print-paged-panel='true'
        data-kangur-print-preferred-target='true'
        data-kangur-print-panel-id={reviewPanelId}
        data-kangur-print-panel-title={reviewPanelTitle}
        data-testid='kangur-exam-review-print-panel'
      >
        <div
          className='kangur-print-only space-y-3 border-b border-slate-200 pb-4'
          data-testid='kangur-exam-review-print-summary'
        >
          <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
            {reviewPanelTitle}
          </div>
          <p className='text-base font-semibold leading-relaxed text-slate-900'>
            {question.question}
          </p>
          <ol className='space-y-2 text-sm text-slate-700'>
            {question.choices.map((choice, index) => {
              const isCorrect = choice === question.answer;
              const isUserChoice = choice === userAnswer;
              return (
                <li
                  key={`review-print-${String(choice)}-${index}`}
                  className='rounded-lg border border-slate-300 px-4 py-2'
                  data-testid={`kangur-exam-review-print-choice-${index}`}
                >
                  <span className='font-semibold text-slate-500'>
                    {String.fromCharCode(65 + index)}.
                  </span>{' '}
                  {choice}
                  {isCorrect ? ' (poprawna)' : ''}
                  {isUserChoice && !isCorrect ? ' (twoja odpowiedź)' : ''}
                </li>
              );
            })}
          </ol>
          {question.explanation ? (
            <p className='text-sm text-slate-600'>Wyjaśnienie: {question.explanation}</p>
          ) : null}
        </div>
        <div data-kangur-print-exclude='true'>
          <ExamNavigation
            ariaLabel='Nawigacja podglądu pytań'
            prevDisabled={reviewing === 0}
            nextDisabled={reviewing === reviewQuestionCount - 1}
            prevLabel='Poprzednie pytanie w podglądzie'
            nextLabel='Następne pytanie w podglądzie'
            onPrev={handleReviewPreviousQuestion}
            onNext={handleReviewNextQuestion}
            onPrintPanel={
              lessonPrint?.onPrintPanel
                ? () => lessonPrint.onPrintPanel?.(reviewPanelId)
                : undefined
            }
            printLabel={lessonNavigationTranslations('printPanel')}
            progressLabel={`${reviewing + 1}/${reviewQuestionCount}`}
            progressAriaLabel={`Pytanie ${reviewing + 1} z ${reviewQuestionCount}`}
          />
          <nav aria-label='Nawigacja podglądu pytań' className={LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME}>
            <div
              className={cn(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME, 'pt-2')}
              role='group'
              aria-label='Nawigacja podglądu pytań'
            >
              {renderKangurLessonNavigationIconButton({
                onClick: handleExitReview,
                className: compactActionClassName,
                'aria-label': 'Podsumowanie',
                icon: ChevronLeft,
                title: 'Podsumowanie',
              })}
            </div>
            <span className='break-words text-center text-xs font-bold [color:var(--kangur-page-muted-text)]'>
              {reviewing + 1}/{reviewQuestionCount}
            </span>
          </nav>

          <KangurInfoCard
            className='flex w-full flex-col items-center text-center kangur-panel-gap rounded-[24px]'
            data-testid='kangur-exam-review-shell'
            padding='lg'
            tone='neutral'
          >
            <div className='flex w-full flex-col items-center justify-center gap-2 text-center sm:flex-row sm:flex-wrap sm:justify-center'>
              <p className='break-words text-center text-sm font-bold uppercase tracking-wide text-orange-500'>
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
            <p className='mx-auto max-w-2xl break-words text-center font-semibold leading-relaxed [color:var(--kangur-page-text)]'>
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

          <div className={cn(KANGUR_STACK_TIGHT_CLASSNAME, 'w-full max-w-2xl')}>
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
                    'flex items-center justify-start kangur-panel-gap px-4 py-3 text-left font-semibold',
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
                  <span className='min-w-0 flex-1 break-words text-left'>{choice}</span>
                  {choice === question.answer && (
                    <>
                      <CheckCircle
                        aria-hidden='true'
                        className='w-4 h-4 text-green-600 ml-auto flex-shrink-0'
                      />
                      <span className='sr-only'>Poprawna odpowiedź</span>
                    </>
                  )}
                  {choice === userAnswer && choice !== question.answer && (
                    <>
                      <XCircle
                        aria-hidden='true'
                        className='w-4 h-4 text-red-500 ml-auto flex-shrink-0'
                      />
                      <span className='sr-only'>Błędna odpowiedź</span>
                    </>
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
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-auto flex w-full max-w-4xl flex-col items-center text-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <nav
        aria-label='Nawigacja podsumowania Kangur Matematyczny'
        className={LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME}
        data-kangur-print-exclude='true'
      >
        <div
          className={LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME}
          role='group'
          aria-label='Nawigacja podsumowania Kangur Matematyczny'
        >
          <KangurButton
            onClick={onBack}
            className={compactActionClassName}
            size='lg'
            type='button'
            variant='surface'
          >
            {translations('kangurExam.actions.backToMenu')}
          </KangurButton>
          {lessonPrint?.onPrintPanel ? (
            <KangurButton
              onClick={() => lessonPrint.onPrintPanel?.(summaryPanelId)}
              className={compactActionClassName}
              data-testid='kangur-exam-summary-print-button'
              size='sm'
              type='button'
              variant='surface'
              aria-label={printPanelLabel}
              title={printPanelLabel}
            >
              <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
              <span className='sr-only'>{printPanelLabel}</span>
            </KangurButton>
          ) : null}
        </div>
      </nav>
      <KangurPracticeGameSummary dataTestId='kangur-exam-summary-shell'>
        <KangurPracticeGameSummaryEmoji emoji={emoji} dataTestId='kangur-exam-summary-emoji' />
        <KangurPracticeGameSummaryTitle
          accent='amber'
          title={summaryTitle}
        />
        <KangurPracticeGameSummaryProgress
          accent='amber'
          ariaLabel={translations('kangurExam.progressAriaLabel')}
          ariaValueText={getKangurMiniGameAccuracyText(translations, pct)}
          dataTestId='kangur-exam-summary-progress-bar'
          percent={pct}
        />
        <p className='break-words text-sm [color:var(--kangur-page-muted-text)]'>
          {getKangurMiniGameAccuracyText(translations, pct)}
        </p>
        <KangurPracticeGameSummaryMessage className='text-sm'>
          {pct === 100
            ? translations('kangurExam.summary.perfect')
            : pct >= 70
              ? translations('kangurExam.summary.good')
              : pct >= 40
                ? translations('kangurExam.summary.fair')
                : translations('kangurExam.summary.retry')}
        </KangurPracticeGameSummaryMessage>
      </KangurPracticeGameSummary>

      <p className='break-words text-center text-sm font-semibold [color:var(--kangur-page-muted-text)]'>
        Kliknij pytanie, aby zobaczyć rozwiązanie:
      </p>

      <div
        aria-label='Przegląd pytań testowych'
        className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-4'
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
                <>
                  <CheckCircle aria-hidden='true' className='w-4 h-4 text-green-600' />
                  <span className='sr-only'>Poprawna odpowiedź</span>
                </>
              ) : (
                <>
                  <XCircle aria-hidden='true' className='w-4 h-4 text-red-500' />
                  <span className='sr-only'>Błędna odpowiedź</span>
                </>
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
  const translations = useTranslations('KangurGamePage');
  const miniGameTranslations = useTranslations('KangurMiniGames');
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
    const score = questions.reduce(
      (acc, question) => acc + (answers[question.id] === question.answer ? 1 : 0),
      0
    );
    const totalQuestions = questions.length;
    const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const summaryTitle = getKangurMiniGameScoreLabel(miniGameTranslations, score, totalQuestions);

    return (
      <div
        className={`mx-auto flex w-full max-w-4xl flex-col items-center text-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
        data-kangur-print-panel='true'
        data-kangur-print-paged-panel='true'
        data-kangur-print-preferred-target='true'
        data-kangur-print-panel-id='kangur-exam-summary'
        data-kangur-print-panel-title={summaryTitle}
        data-testid='kangur-exam-summary-print-panel'
      >
        <div
          className='kangur-print-only space-y-3 border-b border-slate-200 pb-4'
          data-testid='kangur-exam-print-summary'
        >
          <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
            {translations('resultProgress', { score, total: totalQuestions })}
          </div>
          <p className='text-base font-semibold leading-relaxed text-slate-900'>
            {getKangurMiniGameAccuracyText(miniGameTranslations, pct)}
          </p>
          <p className='text-sm text-slate-600'>{translations('examResultPrintHint')}</p>
        </div>
        <div data-kangur-print-exclude='true'>
          <ExamSummary questions={questions} answers={answers} />
        </div>
      </div>
    );
  }

  const activeQuestion = questions[current];
  if (!activeQuestion) {
    return <ExamSummary questions={questions} answers={answers} />;
  }
  const selected = answers[activeQuestion.id];

  const navigationValue = {
    onPrev: handlePrev,
    onNext: handleNext,
    prevDisabled: current === 0,
    nextDisabled: questions.length === 0,
    prevLabel: current === 0 ? 'Brak poprzedniego pytania' : 'Poprzednie pytanie',
    nextLabel: current === questions.length - 1 ? 'Zakończ test' : 'Następne pytanie',
    progressLabel: `${current + 1}/${questions.length}`,
    progressAriaLabel: `Pytanie ${current + 1} z ${questions.length}`,
  };

  return (
    <div className={`mx-auto flex w-full max-w-4xl flex-col items-center text-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <div
        className='kangur-print-only space-y-3 border-b border-slate-200 pb-4'
        data-testid='kangur-exam-print-summary'
      >
        <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
          {translations('practiceQuestion.label', { number: current + 1 })}
        </div>
        <p className='text-base font-semibold leading-relaxed text-slate-900'>
          {activeQuestion.question}
        </p>
        <ol className='space-y-2 text-sm text-slate-700'>
          {activeQuestion.choices.map((choice, index) => (
            <li
              key={`print-${String(choice)}-${index}`}
              className='rounded-lg border border-slate-300 px-4 py-2'
              data-testid={`kangur-exam-print-choice-${index}`}
            >
              <span className='font-semibold text-slate-500'>{String.fromCharCode(65 + index)}.</span>{' '}
              {choice}
            </li>
          ))}
        </ol>
        <p className='text-sm text-slate-600'>{translations('examPrintHint')}</p>
      </div>
      <div data-kangur-print-exclude='true'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={current}
            {...questionMotionProps}
            className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
          >
            <ExamNavigationProvider value={navigationValue}>
              <ExamQuestion
                q={activeQuestion}
                qIndex={current}
                total={questions.length}
                selected={selected}
                onSelect={handleSelect}
              />
            </ExamNavigationProvider>
            {!selected && (
              <p className='break-words text-center text-xs [color:var(--kangur-page-muted-text)]'>
                Możesz pominąć pytanie i wrócić do niego później
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
