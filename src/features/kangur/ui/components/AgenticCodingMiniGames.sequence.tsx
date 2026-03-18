import { useState } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_PANEL_GAP_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';

import type { SequenceGameConfig } from './AgenticCodingMiniGames.types';

export function AgenticSequenceGame({
  accent,
  config,
}: {
  accent: KangurAccent;
  config: SequenceGameConfig;
}): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorId, setErrorId] = useState<string | null>(null);
  const completed = config.steps.map((_, index) => index < currentIndex);
  const isComplete = currentIndex >= config.steps.length;

  const handleStepClick = (index: number): void => {
    if (isComplete) return;
    if (index === currentIndex) {
      setCurrentIndex((prev) => Math.min(prev + 1, config.steps.length));
      setErrorId(null);
      return;
    }
    const id = `step-${index}`;
    setErrorId(id);
    setTimeout(() => setErrorId((current) => (current === id ? null : current)), 600);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonVisual
        accent={accent}
        caption={config.svgLabel}
        maxWidthClassName='max-w-full'
      >
        <SequenceGameSvg />
      </KangurLessonVisual>
      <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent={accent}>{config.title}</KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            {Math.min(currentIndex, config.steps.length)}/{config.steps.length}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>{config.prompt}</KangurLessonCaption>
      </KangurLessonCallout>
      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
        {config.steps.map((label, index) => {
          const isDone = completed[index];
          const isError = errorId === `step-${index}`;
          return (
            <button
              key={label}
              type='button'
              aria-pressed={isDone}
              onClick={() => handleStepClick(index)}
              className={cn(
                'soft-card w-full border px-4 py-3 text-left text-sm font-semibold transition-all',
                isDone
                  ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200/80 bg-white text-slate-900 hover:border-slate-300/80',
                isError ? 'border-rose-200/80 bg-rose-50 text-rose-900' : ''
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {isComplete ? (
        <KangurLessonInset accent={accent}>
          <KangurLessonCaption className='text-left text-emerald-900'>
            {config.success}
          </KangurLessonCaption>
        </KangurLessonInset>
      ) : null}
    </KangurLessonStack>
  );
}

function SequenceGameSvg(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: progres kolejnych kroków.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .track { stroke: #e2e8f0; stroke-width: 6; stroke-linecap: round; }
        .dot { fill: #6366f1; animation: pulse 2.6s ease-in-out infinite; }
        .dot-2 { animation-delay: 0.6s; }
        .dot-3 { animation-delay: 1.2s; }
        .dot-4 { animation-delay: 1.8s; }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot { animation: none; }
        }
      `}</style>
      <line className='track' x1='40' x2='320' y1='60' y2='60' />
      <circle className='dot' cx='60' cy='60' r='10' />
      <circle className='dot dot-2' cx='140' cy='60' r='10' />
      <circle className='dot dot-3' cx='220' cy='60' r='10' />
      <circle className='dot dot-4' cx='300' cy='60' r='10' />
    </svg>
  );
}
