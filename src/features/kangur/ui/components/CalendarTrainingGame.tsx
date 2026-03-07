import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_OPTION_CARD_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
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
    return <div className='text-sm text-gray-500'>Brak pytania.</div>;
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
        <div className='text-6xl'>{score >= 5 ? '🏆' : score >= 3 ? '😊' : '💪'}</div>
        <h3 className='text-2xl font-extrabold text-green-700'>
          Wynik: {score}/{TOTAL}
        </h3>
        {xpEarned > 0 && (
          <div className='bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-full text-sm'>
            +{xpEarned} XP ✨
          </div>
        )}
        <p className='text-gray-500 text-center max-w-xs'>
          {score === TOTAL
            ? 'Idealnie! Świetnie znasz kalendarz!'
            : 'Ćwicz dalej, a zostaniesz mistrzem kalendarza!'}
        </p>
        <div className='flex gap-3'>
          <KangurButton onClick={handleRestart} size='lg' variant='secondary'>
            <RefreshCw className='w-4 h-4' /> Jeszcze raz
          </KangurButton>
          <KangurButton onClick={onFinish} size='lg' variant='primary'>
            Zakończ lekcję ✅
          </KangurButton>
        </div>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-5 w-full'>
      {/* Progress dots */}
      <div className='flex gap-2'>
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

      <KangurPanel className='w-full text-center' padding='lg' variant='soft'>
        <p className='text-lg font-extrabold text-green-800'>{question.question}</p>
      </KangurPanel>

      <div className='grid grid-cols-2 gap-3 w-full'>
        {question.choices.map((choice, index) => {
          let choiceClassName = cn(
            'border-slate-200/80 text-slate-700',
            KANGUR_ACCENT_STYLES.emerald.hoverCard
          );
          if (selected !== null) {
            if (choice === question.answer) {
              choiceClassName = cn(
                KANGUR_ACCENT_STYLES.emerald.activeCard,
                KANGUR_ACCENT_STYLES.emerald.activeText
              );
            } else if (choice === selected) {
              choiceClassName = cn(
                KANGUR_ACCENT_STYLES.rose.activeCard,
                KANGUR_ACCENT_STYLES.rose.activeText
              );
            } else {
              choiceClassName = 'border-slate-200/80 bg-white/92 text-slate-400 opacity-70';
            }
          }
          return (
            <motion.button
              key={choice}
              whileHover={selected === null ? { scale: 1.04 } : {}}
              whileTap={selected === null ? { scale: 0.97 } : {}}
              onClick={() => handleSelect(choice)}
              className={cn(
                KANGUR_OPTION_CARD_CLASSNAME,
                'rounded-[24px] px-4 py-3 font-bold text-base transition-all',
                choiceClassName
              )}
              data-testid={`calendar-training-choice-${index}`}
            >
              {choice}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-lg ${
              selected === question.answer
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
