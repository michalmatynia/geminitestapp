import { useKangurUnifiedLessonBack } from '@/features/kangur/ui/lessons/lesson-components';

import ClockTrainingGame from './ClockTrainingGame';
import type { ClockTrainingSectionId } from './clock-training-utils';
import type { ClockPracticeTask } from './ClockLesson.types';

type AnalogClockProps = {
  hours: number;
  minutes: number;
  label?: string;
  highlightHour?: boolean;
  highlightMinute?: boolean;
  showHourHand?: boolean;
  showMinuteHand?: boolean;
};

type ClockTrainingSlideProps = {
  section: ClockTrainingSectionId;
  practiceTasks: ClockPracticeTask[];
};

export const ClockTrainingSlide = ({
  section,
  practiceTasks,
}: ClockTrainingSlideProps): React.JSX.Element => {
  const returnToHub = useKangurUnifiedLessonBack();

  return (
    <ClockTrainingGame
      completionPrimaryActionLabel='Wróć do tematów'
      enableAdaptiveRetry={false}
      hideModeSwitch
      onFinish={returnToHub}
      practiceTasks={practiceTasks}
      section={section}
      showTaskTitle
      showTimeDisplay
    />
  );
};

export function AnalogClock({
  hours,
  minutes,
  label,
  highlightHour = false,
  highlightMinute = false,
  showHourHand = true,
  showMinuteHand = true,
}: AnalogClockProps): React.JSX.Element {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <div className='flex flex-col items-center gap-2'>
      <svg viewBox='0 0 200 200' width='180' height='180' className='drop-shadow-lg'>
        <circle
          cx='100'
          cy='100'
          r='95'
          fill='var(--kangur-soft-card-background)'
          stroke='#6366f1'
          strokeWidth='4'
        />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 100 + 80 * Math.cos(angle);
          const y1 = 100 + 80 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke='#4f46e5'
              strokeWidth='3'
              strokeLinecap='round'
            />
          );
        })}
        {Array.from({ length: 60 }, (_, i) => {
          if (i % 5 === 0) return null;
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const x1 = 100 + 85 * Math.cos(angle);
          const y1 = 100 + 85 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke='#a5b4fc' strokeWidth='1' />
          );
        })}
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 100 + 66 * Math.cos(angle);
          const y = 100 + 66 * Math.sin(angle);
          return (
            <text
              key={n}
              x={x}
              y={y}
              textAnchor='middle'
              dominantBaseline='central'
              fontSize='14'
              fontWeight='bold'
              fill='#3730a3'
            >
              {n}
            </text>
          );
        })}
        {showHourHand ? (
          <line
            data-testid='clock-lesson-hour-hand'
            x1='100'
            y1='100'
            x2={100 + 48 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
            y2={100 + 48 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
            stroke={highlightHour ? '#dc2626' : '#1e1b4b'}
            strokeWidth={highlightHour ? 8 : 6}
            strokeLinecap='round'
          />
        ) : null}
        {showMinuteHand ? (
          <line
            data-testid='clock-lesson-minute-hand'
            x1='100'
            y1='100'
            x2={100 + 68 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
            y2={100 + 68 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
            stroke={highlightMinute ? '#16a34a' : '#4f46e5'}
            strokeWidth={highlightMinute ? 6 : 4}
            strokeLinecap='round'
          />
        ) : null}
        <circle cx='100' cy='100' r='6' fill='#4f46e5' />
      </svg>
      {label ? <div className='text-sm font-semibold text-indigo-900'>{label}</div> : null}
    </div>
  );
}
