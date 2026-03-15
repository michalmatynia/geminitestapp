import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurGlassPanel,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurQuestion, KangurQuestionChoice } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

export type QuestionCardProps = {
  question: KangurQuestion;
  onAnswer: (correct: boolean) => void;
  questionNumber: number;
  total: number;
  timeLimit: number;
};

type AnalogClockSmallProps = {
  hours: number;
  minutes: number;
  ariaLabel?: string;
};

function AnalogClockSmall({
  hours,
  minutes,
  ariaLabel,
}: AnalogClockSmallProps): React.JSX.Element {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <svg
      aria-label={ariaLabel}
      role='img'
      viewBox='0 0 200 200'
      width='140'
      height='140'
      className='drop-shadow-lg'
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

export default function QuestionCard({
  question,
  onAnswer,
  questionNumber,
  total,
  timeLimit,
}: QuestionCardProps): React.JSX.Element {
  const questionHeadingId = useId();
  const questionDescriptionId = useId();
  const choicesGroupId = useId();
  const [selected, setSelected] = useState<KangurQuestionChoice | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    setSelected(null);
    setShowResult(false);
    setTimeLeft(timeLimit);
  }, [question, timeLimit]);

  useEffect(() => {
    if (showResult) {
      return;
    }
    if (timeLeft <= 0) {
      setShowResult(true);
      const timeoutId = setTimeout(() => onAnswer(false), 900);
      return () => clearTimeout(timeoutId);
    }

    const timeoutId = setTimeout(() => setTimeLeft((remaining) => remaining - 1), 1000);
    return () => clearTimeout(timeoutId);
  }, [onAnswer, showResult, timeLeft]);

  const handleChoice = (choice: KangurQuestionChoice): void => {
    if (showResult) {
      return;
    }
    setSelected(choice);
    setShowResult(true);
    const isCorrect = choice === question.answer;
    setTimeout(() => onAnswer(isCorrect), 900);
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
  const clockAriaLabel = `Zegar analogowy pokazuje godzinę ${normalizedClockHours}:${String(
    normalizedClockMinutes
  ).padStart(2, '0')}.`;

  return (
    <motion.section
      aria-labelledby={questionHeadingId}
      key={question.question}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className='flex flex-col items-center gap-6 w-full max-w-md'
    >
      <div
        aria-live='polite'
        aria-atomic='true'
        className='text-sm font-semibold [color:var(--kangur-page-muted-text)]'
      >
        Pytanie {questionNumber} z {total}
      </div>

      <KangurProgressBar
        accent={timerAccent}
        aria-label='Pozostały czas'
        aria-valuetext={`${timeLeft} sekund pozostało`}
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
              Którą godzinę pokazuje zegar?
            </h3>
            <AnalogClockSmall
              ariaLabel={clockAriaLabel}
              hours={normalizedClockHours}
              minutes={normalizedClockMinutes}
            />
            <div id={questionDescriptionId} className='text-sm [color:var(--kangur-page-muted-text)]'>
              Wybierz odpowiedź, która pasuje do położenia wskazówek.
            </div>
          </div>
        ) : (
          <>
            <h3
              id={questionHeadingId}
              className='mb-2 text-3xl font-extrabold [color:var(--kangur-page-text)] sm:text-5xl'
            >
              {question.question}
            </h3>
            <div id={questionDescriptionId} className='text-sm [color:var(--kangur-page-muted-text)]'>
              Jaka jest odpowiedź?
            </div>
          </>
        )}
      </KangurGlassPanel>

      <div
        aria-describedby={questionDescriptionId}
        aria-labelledby={questionHeadingId}
        className='grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'
        id={choicesGroupId}
        role='group'
      >
        {question.choices.map((choice) => {
          let accent: KangurAccent = 'indigo';
          let emphasis: 'neutral' | 'accent' = 'neutral';
          let state: 'default' | 'muted' = 'default';
          let cardClass = '[color:var(--kangur-page-text)]';
          if (showResult) {
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
          return (
            <KangurAnswerChoiceCard
              accent={accent}
              aria-disabled={showResult}
              aria-label={`Odpowiedź ${String(choice)}`}
              buttonClassName={cn(
                'flex items-center justify-center px-4 py-4 text-center text-xl font-bold shadow sm:text-2xl',
                cardClass,
                showResult ? 'cursor-default' : 'cursor-pointer'
              )}
              data-testid={`question-card-choice-${String(choice)}`}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role='status'
            className={`text-2xl font-bold ${selected === question.answer ? 'text-green-500' : 'text-red-500'}`}
          >
            {selected === question.answer
              ? '🎉 Dobrze!'
              : timeLeft <= 0
                ? `⏰ Czas minął! Odpowiedź: ${question.answer}`
                : `❌ Odpowiedź to ${question.answer}`}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
