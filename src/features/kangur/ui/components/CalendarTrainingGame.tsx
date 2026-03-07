import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurInlineFallback,
  KangurOptionCardButton,
  KangurResultBadge,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_STEP_PILL_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  addXp,
  buildLessonMasteryUpdate,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { cn } from '@/shared/utils';

type CalendarTrainingGameProps = {
  onFinish: () => void;
};

type CalendarQuestion = {
  question: string;
  answer: string;
  choices: string[];
};

const MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
] as const;
const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const MONTHS_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(): CalendarQuestion {
  const type = randInt(0, 4);

  if (type === 0) {
    // Which month is number X?
    const idx = randInt(0, 11);
    const answer = MONTHS[idx] ?? MONTHS[0];
    const wrongs = shuffle(MONTHS.filter((_, i) => i !== idx)).slice(0, 3);
    return {
      question: `Który miesiąc jest ${idx + 1}. w roku?`,
      answer,
      choices: shuffle([answer, ...wrongs]),
    };
  }

  if (type === 1) {
    // What number is month X?
    const idx = randInt(0, 11);
    const answer = String(idx + 1);
    const wrongs = shuffle(
      Array.from({ length: 12 }, (_, i) => String(i + 1)).filter((n) => n !== answer)
    ).slice(0, 3);
    return {
      question: `Który numer kolejny ma miesiąc ${MONTHS[idx] ?? MONTHS[0]}?`,
      answer,
      choices: shuffle([answer, ...wrongs]),
    };
  }

  if (type === 2) {
    // How many days in month X?
    const idx = randInt(0, 11);
    const answer = String(MONTHS_DAYS[idx] ?? MONTHS_DAYS[0]);
    const allCounts = ['28', '29', '30', '31'];
    const wrongs = shuffle(allCounts.filter((d) => d !== answer)).slice(0, 3);
    return {
      question: `Ile dni ma miesiąc ${MONTHS[idx] ?? MONTHS[0]}?`,
      answer,
      choices: shuffle([answer, ...wrongs]),
    };
  }

  if (type === 3) {
    // Which day comes after day X?
    const idx = randInt(0, 5);
    const answer = DAYS[idx + 1] ?? DAYS[0]!;
    const wrongs = shuffle(DAYS.filter((d) => d !== answer)).slice(0, 3);
    return {
      question: `Jaki dzień tygodnia następuje po ${DAYS[idx] ?? DAYS[0]}?`,
      answer,
      choices: shuffle([answer, ...wrongs]),
    };
  }

  // type === 4: How many days in a week / months in a year?
  const isWeek = Math.random() > 0.5;
  const answer = isWeek ? '7' : '12';
  const wrong1 = isWeek ? ['5', '6', '8'] : ['10', '11', '13'];
  return {
    question: isWeek ? 'Ile dni ma tydzień?' : 'Ile miesięcy ma rok?',
    answer,
    choices: shuffle([answer, ...wrong1]),
  };
}

const TOTAL = 6;

export default function CalendarTrainingGame({
  onFinish,
}: CalendarTrainingGameProps): React.JSX.Element {
  const [questions] = useState(() => Array.from({ length: TOTAL }, generateQuestion));
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const question = questions[current];
  if (!question) {
    return <KangurInlineFallback data-testid='calendar-training-empty' title='Brak pytania.' />;
  }

  const handleSelect = (choice: string) => {
    if (selected !== null) return;
    setSelected(choice);
    const correct = choice === question.answer;
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);

    setTimeout(() => {
      setSelected(null);
      if (current + 1 >= TOTAL) {
        handleDone(newScore);
      } else {
        setCurrent((c) => c + 1);
      }
    }, 1200);
  };

  const handleDone = (finalScore: number) => {
    const isPerfect = finalScore === TOTAL;
    const isGood = finalScore >= 4;
    const xp = isPerfect ? 60 : isGood ? 30 : 10;
    const prog = loadProgress();
    addXp(xp, {
      calendarPerfect: isPerfect ? prog.calendarPerfect + 1 : prog.calendarPerfect,
      lessonMastery: buildLessonMasteryUpdate(prog, 'calendar', (finalScore / TOTAL) * 100),
    });
    setXpEarned(xp);
    setDone(true);
  };

  const handleRestart = () => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setDone(false);
    setXpEarned(0);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-col items-center gap-5 py-4'
      >
        <KangurGlassPanel
          className='flex w-full max-w-sm flex-col items-center gap-5 text-center'
          data-testid='calendar-training-summary-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <KangurDisplayEmoji
            aria-hidden='true'
            data-testid='calendar-training-summary-emoji'
            size='lg'
          >
            {score >= 5 ? '🏆' : score >= 3 ? '😊' : '💪'}
          </KangurDisplayEmoji>
          <KangurHeadline accent='emerald' as='h3' data-testid='calendar-training-summary-title'>
            Wynik: {score}/{TOTAL}
          </KangurHeadline>
          {xpEarned > 0 && (
            <KangurStatusChip accent='indigo' className='px-4 py-2 text-sm font-bold'>
              +{xpEarned} XP ✨
            </KangurStatusChip>
          )}
          <p className='max-w-xs text-center text-slate-500'>
            {score === TOTAL
              ? 'Idealnie! Świetnie znasz kalendarz!'
              : 'Ćwicz dalej, a zostaniesz mistrzem kalendarza!'}
          </p>
          <div className='flex gap-3'>
            <KangurButton onClick={handleRestart} size='lg' variant='surface'>
              <RefreshCw className='w-4 h-4' /> Jeszcze raz
            </KangurButton>
            <KangurButton onClick={onFinish} size='lg' variant='primary'>
              Zakończ lekcję ✅
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </motion.div>
    );
  }

  return (
    <section
      aria-labelledby='calendar-training-question-title'
      className='flex flex-col items-center gap-5 w-full'
    >
      <div aria-live='polite' aria-atomic='true' className='sr-only'>
        Pytanie {current + 1} z {TOTAL}. {question.question}
      </div>
      {/* Progress dots */}
      <div aria-hidden='true' className='flex gap-2'>
        {questions.map((_, i) => (
          <div
            key={i}
            className={cn(
              KANGUR_STEP_PILL_CLASSNAME,
              'h-[14px] min-w-[14px]',
              i < current
                ? 'w-6 bg-emerald-200'
                : i === current
                  ? 'w-8 scale-[1.04] bg-emerald-500'
                  : 'w-[14px] soft-cta opacity-80'
            )}
            data-testid={`calendar-training-progress-${i}`}
          />
        ))}
      </div>

      <KangurGlassPanel
        className='w-full text-center'
        data-testid='calendar-training-question-shell'
        padding='lg'
        surface='solid'
        variant='soft'
      >
        <p id='calendar-training-question-title' className='text-lg font-extrabold text-green-800'>
          {question.question}
        </p>
      </KangurGlassPanel>

      <div
        aria-labelledby='calendar-training-question-title'
        className='grid grid-cols-2 gap-3 w-full'
        role='group'
      >
        {question.choices.map((choice, index) => {
          let accent: KangurAccent = 'emerald';
          let emphasis: 'neutral' | 'accent' = 'neutral';
          let state: 'default' | 'muted' = 'default';
          let choiceClassName = 'text-slate-700';
          if (selected !== null) {
            if (choice === question.answer) {
              accent = 'emerald';
              emphasis = 'accent';
              choiceClassName = KANGUR_ACCENT_STYLES.emerald.activeText;
            } else if (choice === selected) {
              accent = 'rose';
              emphasis = 'accent';
              choiceClassName = KANGUR_ACCENT_STYLES.rose.activeText;
            } else {
              accent = 'slate';
              state = 'muted';
              choiceClassName = '';
            }
          }
          return (
            <motion.div
              key={choice}
              whileHover={selected === null ? { scale: 1.04 } : {}}
              whileTap={selected === null ? { scale: 0.97 } : {}}
            >
              <KangurOptionCardButton
                accent={accent}
                aria-disabled={selected !== null}
                aria-label={`Odpowiedz ${choice}`}
                className={cn(
                  'w-full rounded-[24px] px-4 py-3 font-bold text-base transition-all',
                  choiceClassName,
                  selected === null ? 'cursor-pointer' : 'cursor-default'
                )}
                data-testid={`calendar-training-choice-${index}`}
                emphasis={emphasis}
                onClick={() => handleSelect(choice)}
                state={state}
                type='button'
              >
                {choice}
              </KangurOptionCardButton>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.div
            aria-atomic='true'
            aria-live='assertive'
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role='status'
          >
            <KangurResultBadge
              data-testid='calendar-training-feedback'
              tone={selected === question.answer ? 'success' : 'error'}
            >
              {selected === question.answer ? (
                <>
                  <CheckCircle className='w-5 h-5' /> Brawo! Dobrze!
                </>
              ) : (
                <>
                  <XCircle className='w-5 h-5' /> Poprawna odpowiedź: {question.answer}
                </>
              )}
            </KangurResultBadge>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
