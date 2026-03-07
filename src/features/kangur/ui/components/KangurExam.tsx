import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';

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
import { useKangurGameContext } from '@/features/kangur/ui/context/KangurGameContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { getKangurQuestions } from '@/features/kangur/ui/services/kangur-questions';
import type { KangurExamQuestion, KangurQuestionChoice } from '@/features/kangur/ui/types';

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
  const Illustration = ILLUSTRATIONS[q.id];

  return (
    <div className='flex flex-col gap-4 w-full'>
      <div className='flex items-center gap-2'>
        <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
          <div
            style={{ width: `${(qIndex / total) * 100}%` }}
            className='h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full transition-all duration-500'
          />
        </div>
        <span className='text-xs font-bold text-gray-400'>
          {qIndex + 1}/{total}
        </span>
      </div>

      <div className='bg-white rounded-2xl shadow p-5 flex flex-col gap-3'>
        <div className='flex items-center justify-between mb-1'>
          <p className='text-sm font-bold text-orange-500 uppercase tracking-wide'>
            Pytanie {qIndex + 1}
          </p>
          <span className='text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5'>
            {POINT_LABELS[q.id] || ''}
          </span>
        </div>
        <p className='text-gray-800 font-semibold leading-relaxed'>{q.question}</p>
        {Illustration && (
          <div className='bg-gray-50 rounded-xl p-3 border border-gray-100'>
            <Illustration />
          </div>
        )}
      </div>

      <div className='flex flex-col gap-2'>
        {q.choices.map((choice, index) => (
          <motion.button
            key={`${String(choice)}-${index}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(choice)}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-3 ${
              selected === choice
                ? 'bg-orange-50 border-2 border-orange-400 text-orange-800'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
            }`}
          >
            <span className='w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-extrabold text-sm flex items-center justify-center flex-shrink-0'>
              {String.fromCharCode(65 + index)}
            </span>
            <span>{choice}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ExamSummary({ questions, answers }: ExamSummaryProps): React.JSX.Element {
  const { onBack } = useKangurGameContext();
  const [reviewing, setReviewing] = useState<number | null>(null);
  const score = questions.reduce(
    (acc, question) => acc + (answers[question.id] === question.answer ? 1 : 0),
    0
  );
  const pct = Math.round((score / questions.length) * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🌟' : pct >= 40 ? '👍' : '💪';

  if (reviewing !== null) {
    const question = questions[reviewing];
    if (!question) {
      return (
        <div className='w-full text-center text-sm text-gray-500'>Brak pytania do podglądu.</div>
      );
    }
    const userAnswer = answers[question.id];
    const Illustration = ILLUSTRATIONS[question.id];

    return (
      <div className='w-full flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <KangurButton
            onClick={() => setReviewing(null)}
            size='sm'
            type='button'
            variant='secondary'
          >
            <ChevronLeft className='w-4 h-4' /> Podsumowanie
          </KangurButton>
          <div className='flex gap-2'>
            <KangurButton
              aria-label='Poprzednie pytanie w podgladzie'
              onClick={() => setReviewing(Math.max(0, reviewing - 1))}
              disabled={reviewing === 0}
              className='h-9 w-9 min-w-0 px-0'
              size='sm'
              type='button'
              variant='secondary'
            >
              <ChevronLeft className='w-4 h-4 text-gray-500' />
            </KangurButton>
            <span className='text-xs text-gray-400 self-center font-bold'>
              {reviewing + 1}/{questions.length}
            </span>
            <KangurButton
              aria-label='Nastepne pytanie w podgladzie'
              onClick={() => setReviewing(Math.min(questions.length - 1, reviewing + 1))}
              disabled={reviewing === questions.length - 1}
              className='h-9 w-9 min-w-0 px-0'
              size='sm'
              type='button'
              variant='secondary'
            >
              <ChevronRight className='w-4 h-4 text-gray-500' />
            </KangurButton>
          </div>
        </div>

        <div className='bg-white rounded-2xl shadow p-5 flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-bold text-orange-500 uppercase tracking-wide'>
              Pytanie {reviewing + 1}
            </p>
            <span className='text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5'>
              {POINT_LABELS[question.id] || ''}
            </span>
          </div>
          <p className='text-gray-800 font-semibold leading-relaxed'>{question.question}</p>
          {Illustration && (
            <div className='bg-gray-50 rounded-xl p-3 border border-gray-100'>
              <Illustration />
            </div>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          {question.choices.map((choice, index) => {
            let style = 'bg-white border-2 border-gray-100 text-gray-400 opacity-60';
            if (choice === question.answer) {
              style = 'bg-green-100 border-2 border-green-500 text-green-800';
            } else if (choice === userAnswer) {
              style = 'bg-red-100 border-2 border-red-400 text-red-700';
            }
            return (
              <div
                key={`${String(choice)}-${index}`}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold flex items-center gap-3 ${style}`}
              >
                <span className='w-7 h-7 rounded-full bg-white/50 font-extrabold text-sm flex items-center justify-center flex-shrink-0'>
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{choice}</span>
                {choice === question.answer && (
                  <CheckCircle className='w-4 h-4 text-green-600 ml-auto flex-shrink-0' />
                )}
                {choice === userAnswer && choice !== question.answer && (
                  <XCircle className='w-4 h-4 text-red-500 ml-auto flex-shrink-0' />
                )}
              </div>
            );
          })}
        </div>

        {question.explanation && (
          <div className='bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800'>
            💡 {question.explanation}
          </div>
        )}

        {!userAnswer && (
          <div className='bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-500 text-center'>
            ⏭️ Pytanie pominięte
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='w-full flex flex-col gap-4'
    >
      <div className='bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center gap-4 text-center'>
        <div className='text-6xl'>{emoji}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>
          Wynik: {score}/{questions.length}
        </h2>
        <p className='text-gray-500 text-sm'>
          {pct === 100
            ? 'Idealny wynik! Jesteś mistrzem Kangura! 🦘'
            : pct >= 70
              ? 'Świetnie! Gotowy/a na konkurs!'
              : pct >= 40
                ? 'Dobra robota! Ćwicz dalej!'
                : 'Nie poddawaj się! Spróbuj jeszcze raz!'}
        </p>
        <div className='w-full bg-gray-100 rounded-full h-3 overflow-hidden'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8 }}
            className='h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full'
          />
        </div>
        <p className='text-sm text-gray-400'>{pct}% poprawnych odpowiedzi</p>
      </div>

      <p className='text-center text-sm font-semibold text-gray-500'>
        Kliknij pytanie, aby zobaczyć rozwiązanie:
      </p>

      <div className='grid grid-cols-4 gap-2'>
        {questions.map((question, index) => {
          const userAnswer = answers[question.id];
          const correct = userAnswer === question.answer;
          const skipped = !userAnswer;
          return (
            <motion.button
              key={question.id}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setReviewing(index)}
              className={`rounded-xl p-2 flex flex-col items-center gap-1 shadow transition ${
                skipped
                  ? 'bg-gray-100 border border-gray-200'
                  : correct
                    ? 'bg-green-100 border border-green-300'
                    : 'bg-red-100 border border-red-300'
              }`}
            >
              <span className='text-xs font-bold text-gray-500'>#{index + 1}</span>
              {skipped ? (
                <span className='text-sm'>➖</span>
              ) : correct ? (
                <CheckCircle className='w-4 h-4 text-green-600' />
              ) : (
                <XCircle className='w-4 h-4 text-red-500' />
              )}
              <span
                className={`text-[10px] font-bold ${
                  skipped ? 'text-gray-400' : correct ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {skipped ? 'pom.' : correct ? '✓' : userAnswer}
              </span>
            </motion.button>
          );
        })}
      </div>

      <KangurButton
        onClick={onBack}
        className='w-full'
        size='lg'
        type='button'
        variant='secondary'
      >
        Wróć do menu
      </KangurButton>
    </motion.div>
  );
}

export default function KangurExam(): React.JSX.Element {
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
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        className='w-full flex flex-col gap-4'
      >
        <ExamQuestion
          q={activeQuestion}
          qIndex={current}
          total={questions.length}
          selected={selected}
          onSelect={handleSelect}
        />
        <div className='flex gap-3'>
          <KangurButton
            onClick={handlePrev}
            className='flex-1'
            disabled={current === 0}
            size='lg'
            type='button'
            variant='secondary'
          >
            <ChevronLeft className='w-4 h-4' /> Poprzednie
          </KangurButton>
          <KangurButton
            onClick={handleNext}
            className='flex-1'
            size='lg'
            type='button'
            variant='primary'
          >
            {current === questions.length - 1 ? (
              'Zakończ test 🏁'
            ) : (
              <>
                Następne <ChevronRight className='w-4 h-4' />
              </>
            )}
          </KangurButton>
        </div>
        {!selected && (
          <p className='text-center text-xs text-gray-400'>
            Możesz pominąć pytanie i wrócić do niego później
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
