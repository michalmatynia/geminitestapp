import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import type { KangurQuestion, KangurQuestionChoice } from '@/features/kangur/ui/types';

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
};

function AnalogClockSmall({ hours, minutes }: AnalogClockSmallProps): React.JSX.Element {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <svg viewBox='0 0 200 200' width='140' height='140' className='drop-shadow-lg'>
      <circle cx='100' cy='100' r='95' fill='white' stroke='#6366f1' strokeWidth='4' />
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
  const timerColor =
    timerPercent > 50 ? 'bg-green-400' : timerPercent > 25 ? 'bg-yellow-400' : 'bg-red-500';
  const isClockQuestion = question.question.startsWith('CLOCK:');
  const clockParts = isClockQuestion ? question.question.split(':') : null;
  const clockHours = Number.parseInt(clockParts?.[1] ?? '0', 10);
  const clockMinutes = Number.parseInt(clockParts?.[2] ?? '0', 10);

  return (
    <motion.div
      key={question.question}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className='flex flex-col items-center gap-6 w-full max-w-md'
    >
      <div className='text-sm text-gray-400 font-semibold'>
        Pytanie {questionNumber} z {total}
      </div>

      <div className='w-full bg-gray-100 rounded-full h-4 overflow-hidden'>
        <motion.div
          className={`h-4 rounded-full transition-colors ${timerColor}`}
          animate={{ width: `${timerPercent}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <div className={`text-lg font-bold ${timerPercent <= 25 ? 'text-red-500' : 'text-gray-500'}`}>
        ⏱ {timeLeft}s
      </div>

      <div className='bg-white rounded-3xl shadow-xl px-10 py-8 text-center w-full'>
        {isClockQuestion ? (
          <div className='flex flex-col items-center gap-2'>
            <AnalogClockSmall hours={clockHours} minutes={clockMinutes} />
            <div className='text-gray-400 text-sm'>Ktora godzine pokazuje zegar?</div>
          </div>
        ) : (
          <>
            <div className='text-5xl font-extrabold text-gray-800 mb-2'>{question.question}</div>
            <div className='text-gray-400 text-sm'>Jaka jest odpowiedz?</div>
          </>
        )}
      </div>

      <div className='grid grid-cols-2 gap-4 w-full'>
        {question.choices.map((choice) => {
          let cardClass =
            'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50';
          if (showResult) {
            if (choice === question.answer) {
              cardClass = 'bg-green-400 border-2 border-green-500 text-white';
            } else if (choice === selected) {
              cardClass = 'bg-red-400 border-2 border-red-500 text-white';
            } else {
              cardClass = 'bg-white border-2 border-gray-200 text-gray-400 opacity-60';
            }
          }
          return (
            <motion.button
              key={String(choice)}
              whileHover={!showResult ? { scale: 1.05 } : {}}
              whileTap={!showResult ? { scale: 0.97 } : {}}
              onClick={() => handleChoice(choice)}
              className={`rounded-2xl py-4 text-2xl font-bold shadow transition-all ${cardClass}`}
            >
              {choice}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-2xl font-bold ${selected === question.answer ? 'text-green-500' : 'text-red-500'}`}
          >
            {selected === question.answer
              ? '🎉 Dobrze!'
              : timeLeft <= 0
                ? `⏰ Czas minal! Odpowiedz: ${question.answer}`
                : `❌ Odpowiedz to ${question.answer}`}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
