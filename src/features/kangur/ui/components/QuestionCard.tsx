'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import type { TranslationValues } from 'use-intl';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurGlassPanel,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { KangurQuestionChoice } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

export type QuestionCardQuestion = {
  id?: string;
  question: string;
  choices: KangurQuestionChoice[];
  answer?: KangurQuestionChoice;
};

export type QuestionCardServerResult = {
  correct: boolean;
  timedOut?: boolean;
};

export type QuestionCardProps = {
  question: QuestionCardQuestion;
  onAnswer: (correct: boolean) => void;
  onAnswerChoice?: (choice: KangurQuestionChoice | null, correct?: boolean) => void;
  questionNumber: number;
  total: number;
  timeLimit: number;
  answerMode?: 'client' | 'server';
  serverResult?: QuestionCardServerResult | null;
};

type AnalogClockSmallProps = {
  hours: number;
  minutes: number;
  ariaLabel?: string;
};

const interpolateQuestionCardTemplate = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template;
  }

  const interpolationValues: Record<string, unknown> = values;
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = interpolationValues[key];
    return value === undefined ? match : String(value);
  });
};

const translateQuestionCard = (
  translate: KangurMiniGameTranslate | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string =>
  interpolateQuestionCardTemplate(
    translateKangurMiniGameWithFallback(translate, `questionCard.${key}`, fallback, values),
    values
  );

function AnalogClockSmall(props: AnalogClockSmallProps): React.JSX.Element {
  const { hours, minutes, ariaLabel } = props;
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <svg
      aria-label={ariaLabel}
      role='img'
      viewBox='0 0 200 200'
      className='h-28 w-28 drop-shadow-lg sm:h-36 sm:w-36'
    >
      <circle
        cx='100'
        cy='100'
        r='95'
        fill='var(--kangur-soft-card-background)'
        stroke='#6366f1'
        strokeWidth='4'
      />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 - 90) * (Math.PI / 180);
        return (
          <line
            key={index}
            x1={100 + 80 * Math.cos(angle)}
            y1={100 + 80 * Math.sin(angle)}
            x2={100 + 90 * Math.cos(angle)}
            y2={100 + 90 * Math.sin(angle)}
            stroke='#4f46e5'
            strokeWidth='3'
            strokeLinecap='round'
          />
        );
      })}
      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((value, index) => {
        const angle = (index * 30 - 90) * (Math.PI / 180);
        return (
          <text
            key={value}
            x={100 + 66 * Math.cos(angle)}
            y={100 + 66 * Math.sin(angle)}
            textAnchor='middle'
            dominantBaseline='central'
            fontSize='14'
            fontWeight='bold'
            fill='#3730a3'
          >
            {value}
          </text>
        );
      })}
      <line
        x1='100'
        y1='100'
        x2={100 + 48 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
        y2={100 + 48 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
        stroke='#1e1b4b'
        strokeWidth='6'
        strokeLinecap='round'
      />
      <line
        x1='100'
        y1='100'
        x2={100 + 68 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
        y2={100 + 68 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
        stroke='#4f46e5'
        strokeWidth='4'
        strokeLinecap='round'
      />
      <circle cx='100' cy='100' r='5' fill='#6366f1' />
    </svg>
  );
}

export default function QuestionCard(props: QuestionCardProps): React.JSX.Element {
  const {
    question,
    onAnswer,
    onAnswerChoice,
    questionNumber,
    total,
    timeLimit,
    answerMode = 'client',
    serverResult = null,
  } = props;
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const questionHeadingId = useId();
  const questionDescriptionId = useId();
  const choicesGroupId = useId();
  const resultMessageId = useId();
  const [selected, setSelected] = useState<KangurQuestionChoice | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const isServerMode = answerMode === 'server';
  const resolvedServerResult = isServerMode ? serverResult : null;
  const isCheckingAnswer = isServerMode && showResult && !resolvedServerResult;

  const questionKey = question.id ?? question.question;

  useEffect(() => {
    setSelected(null);
    setShowResult(false);
    setTimeLeft(timeLimit);
  }, [questionKey, timeLimit]);

  useEffect(() => {
    if (showResult) {
      return;
    }
    if (timeLeft <= 0) {
      setShowResult(true);
      onAnswerChoice?.(null, isServerMode ? undefined : false);
      if (!isServerMode) {
        const timeoutId = setTimeout(() => onAnswer(false), 900);
        return () => clearTimeout(timeoutId);
      }
      return;
    }

    const timeoutId = setTimeout(() => setTimeLeft((remaining) => remaining - 1), 1000);
    return () => clearTimeout(timeoutId);
  }, [isServerMode, onAnswer, onAnswerChoice, showResult, timeLeft]);

  const handleChoice = (choice: KangurQuestionChoice): void => {
    if (showResult) {
      return;
    }
    setSelected(choice);
    setShowResult(true);
    const resolvedAnswer = question.answer;
    const isCorrect = !isServerMode && resolvedAnswer !== undefined ? choice === resolvedAnswer : undefined;
    onAnswerChoice?.(choice, isCorrect);
    if (!isServerMode) {
      setTimeout(() => onAnswer(Boolean(isCorrect)), 900);
    }
  };

  const timerPercent = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;
  const timerAccent: KangurAccent =
    timerPercent > 50 ? 'emerald' : timerPercent > 25 ? 'amber' : 'rose';
  const isClockQuestion = question.question.startsWith('CLOCK:');
  const clockParts = isClockQuestion ? question.question.split(':') : null;
  const clockHours = Number.parseInt(clockParts?.[1] ?? '0', 10);
  const clockMinutes = Number.parseInt(clockParts?.[2] ?? '0', 10);
  const normalizedClockHours = ((clockHours % 12) + 12) % 12 || 12;
  const normalizedClockMinutes = Math.max(0, Math.min(59, clockMinutes));
  const clockTime = `${normalizedClockHours}:${String(normalizedClockMinutes).padStart(2, '0')}`;
  const clockAriaLabel = translateQuestionCard(
    translations,
    'clockAriaLabel',
    'Zegar analogowy pokazuje godzinę {time}.',
    { time: clockTime }
  );
  const progressLabel = translateQuestionCard(
    translations,
    'progressLabel',
    'Pytanie {questionNumber} z {total}',
    { questionNumber, total }
  );
  const timerAriaLabel = translateQuestionCard(
    translations,
    'timerAriaLabel',
    'Pozostały czas'
  );
  const timerValueText = translateQuestionCard(
    translations,
    'timerValueText',
    '{timeLeft} sekund pozostało',
    { timeLeft }
  );
  const clockTitle = translateQuestionCard(
    translations,
    'clockTitle',
    'Którą godzinę pokazuje zegar?'
  );
  const clockDescription = translateQuestionCard(
    translations,
    'clockDescription',
    'Wybierz odpowiedź, która pasuje do położenia wskazówek.'
  );
  const defaultDescription = translateQuestionCard(
    translations,
    'defaultDescription',
    'Jaka jest odpowiedź?'
  );
  const choicesAriaLabel = translateQuestionCard(
    translations,
    'choicesAriaLabel',
    'Odpowiedzi'
  );
  const answerChoiceCorrectStatus = translateQuestionCard(
    translations,
    'choiceStatus.correct',
    'poprawna'
  );
  const answerChoiceIncorrectStatus = translateQuestionCard(
    translations,
    'choiceStatus.incorrect',
    'niepoprawna'
  );
  const answerChoiceNotChosenStatus = translateQuestionCard(
    translations,
    'choiceStatus.notChosen',
    'nie wybrano'
  );
  const correctResultLabel = translateQuestionCard(
    translations,
    'result.correct',
    '🎉 Dobrze!'
  );
  const timedOutResultLabel = translateQuestionCard(
    translations,
    'result.timedOut',
    '⏰ Czas minął!'
  );
  const incorrectResultLabel = translateQuestionCard(
    translations,
    'result.incorrect',
    '❌ Nie tym razem.'
  );
  const checkingResultLabel = translateQuestionCard(
    translations,
    'result.checking',
    'Sprawdzamy odpowiedź…'
  );
  const timedOutAnswerResultLabel = translateQuestionCard(
    translations,
    'result.timedOutAnswer',
    '⏰ Czas minął! Odpowiedź: {answer}',
    { answer: String(question.answer ?? '') }
  );
  const answerIsResultLabel = translateQuestionCard(
    translations,
    'result.answerIs',
    '❌ Odpowiedź to {answer}',
    { answer: String(question.answer ?? '') }
  );

  const choicesDescriptionId = showResult
    ? `${questionDescriptionId} ${resultMessageId}`
    : questionDescriptionId;

  return (
    <motion.section
      aria-labelledby={questionHeadingId}
      aria-describedby={questionDescriptionId}
      aria-busy={isCheckingAnswer}
      key={questionKey}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn('flex flex-col items-center w-full max-w-md', KANGUR_PANEL_GAP_CLASSNAME)}
    >
      <div
        aria-live='polite'
        aria-atomic='true'
        className='text-sm font-semibold [color:var(--kangur-page-muted-text)]'
      >
        {progressLabel}
      </div>

      <KangurProgressBar
        accent={timerAccent}
        aria-label={timerAriaLabel}
        aria-valuetext={timerValueText}
        aria-live='off'
        data-testid='question-card-timer-bar'
        size='lg'
        value={timerPercent}
      />
      <div
        aria-hidden='true'
        className={`text-lg font-bold ${
          timerPercent <= 25 ? 'text-rose-500' : '[color:var(--kangur-page-muted-text)]'
        }`}
      >
        ⏱ {timeLeft}s
      </div>

      <KangurGlassPanel
        className='w-full text-center shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]'
        data-testid='question-card-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        {isClockQuestion ? (
          <div className='flex flex-col items-center gap-2'>
            <h3 id={questionHeadingId} className='text-xl font-bold [color:var(--kangur-page-text)]'>
              {clockTitle}
            </h3>
            <AnalogClockSmall
              ariaLabel={clockAriaLabel}
              hours={normalizedClockHours}
              minutes={normalizedClockMinutes}
            />
            <div id={questionDescriptionId} className='text-sm [color:var(--kangur-page-muted-text)]'>
              {clockDescription}
            </div>
          </div>
        ) : (
          <>
            <h3
              id={questionHeadingId}
              className='mb-2 break-words text-2xl font-extrabold [color:var(--kangur-page-text)] sm:text-4xl md:text-5xl'
            >
              {question.question}
            </h3>
            <div id={questionDescriptionId} className='text-sm [color:var(--kangur-page-muted-text)]'>
              {defaultDescription}
            </div>
          </>
        )}
      </KangurGlassPanel>

      <div
        aria-describedby={choicesDescriptionId}
        aria-labelledby={questionHeadingId}
        className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'
        id={choicesGroupId}
        role='group'
        aria-label={choicesAriaLabel}
      >
        {question.choices.map((choice) => {
          let accent: KangurAccent = 'indigo';
          let emphasis: 'neutral' | 'accent' = 'neutral';
          let state: 'default' | 'muted' = 'default';
          let cardClass = '[color:var(--kangur-page-text)]';
          if (showResult) {
            if (isServerMode) {
              if (resolvedServerResult) {
                if (choice === selected) {
                  accent = resolvedServerResult.correct ? 'emerald' : 'rose';
                  emphasis = 'accent';
                  cardClass = resolvedServerResult.correct
                    ? KANGUR_ACCENT_STYLES.emerald.activeText
                    : KANGUR_ACCENT_STYLES.rose.activeText;
                } else {
                  accent = 'slate';
                  state = 'muted';
                  cardClass = 'opacity-60';
                }
              } else if (choice === selected) {
                accent = 'amber';
                emphasis = 'accent';
                cardClass = KANGUR_ACCENT_STYLES.amber.activeText;
              } else {
                accent = 'slate';
                state = 'muted';
                cardClass = 'opacity-60';
              }
            } else {
              if (choice === question.answer) {
                accent = 'emerald';
                emphasis = 'accent';
                cardClass = KANGUR_ACCENT_STYLES.emerald.activeText;
              } else if (choice === selected) {
                accent = 'rose';
                emphasis = 'accent';
                cardClass = KANGUR_ACCENT_STYLES.rose.activeText;
              } else {
                accent = 'slate';
                state = 'muted';
                cardClass = 'opacity-60';
              }
            }
          }
          return (
            <KangurAnswerChoiceCard
              accent={accent}
              aria-disabled={showResult}
              aria-label={`${translateQuestionCard(
                translations,
                'answerChoiceAriaLabel',
                'Odpowiedź {choice}',
                { choice: String(choice) }
              )}${
                showResult && resolvedServerResult
                  ? resolvedServerResult.correct && selected === choice
                    ? `, ${answerChoiceCorrectStatus}`
                    : resolvedServerResult.correct && selected !== choice
                      ? `, ${answerChoiceNotChosenStatus}`
                      : resolvedServerResult.correct === false && selected === choice
                        ? `, ${answerChoiceIncorrectStatus}`
                        : `, ${answerChoiceNotChosenStatus}`
                  : ''
              }`}
              aria-pressed={selected === choice}
              buttonClassName={cn(
                'flex items-center justify-center px-3 py-3 text-center text-lg font-bold shadow sm:px-4 sm:py-4 sm:text-xl md:text-2xl',
                isCoarsePointer && 'min-h-[4.5rem] touch-manipulation select-none active:scale-[0.98]',
                cardClass,
                showResult ? 'cursor-default' : 'cursor-pointer'
              )}
              data-testid={`question-card-choice-${String(choice)}`}
              disabled={showResult}
              emphasis={emphasis}
              hoverScale={1.05}
              interactive={!showResult}
              key={String(choice)}
              onClick={() => handleChoice(choice)}
              state={state}
              tapScale={0.97}
              type='button'
            >
              {choice}
            </KangurAnswerChoiceCard>
          );
        })}
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            aria-atomic='true'
            aria-live='assertive'
            id={resultMessageId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role='status'
            className={cn(
              'text-2xl font-bold',
              isServerMode
                ? resolvedServerResult
                  ? resolvedServerResult.correct
                    ? 'text-green-500'
                    : resolvedServerResult.timedOut
                      ? 'text-amber-500'
                      : 'text-red-500'
                  : 'text-amber-500'
                : selected === question.answer
                  ? 'text-green-500'
                  : 'text-red-500'
            )}
          >
            {isServerMode
              ? resolvedServerResult
                ? resolvedServerResult.correct
                  ? correctResultLabel
                  : resolvedServerResult.timedOut
                    ? timedOutResultLabel
                    : incorrectResultLabel
                : checkingResultLabel
              : selected === question.answer
                ? correctResultLabel
                : timeLeft <= 0
                  ? timedOutAnswerResultLabel
                  : answerIsResultLabel}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
