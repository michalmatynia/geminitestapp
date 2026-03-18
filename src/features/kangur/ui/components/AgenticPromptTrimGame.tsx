'use client';

import { useMemo, useState } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';

type PromptToken = {
  id: string;
  label: string;
  required: boolean;
};

const PROMPT_TOKENS: PromptToken[] = [
  { id: 'goal', label: 'Goal: add retry backoff.', required: true },
  { id: 'context', label: 'Context: api/notifications.ts + retry.ts.', required: true },
  { id: 'constraints', label: 'Constraints: no new deps.', required: true },
  { id: 'done', label: 'Done: tests + lint pass.', required: true },
  { id: 'fluff-1', label: 'Please kindly help me.', required: false },
  { id: 'fluff-2', label: 'As an AI, do your best.', required: false },
  { id: 'fluff-3', label: 'Make it perfect and elegant.', required: false },
  { id: 'fluff-4', label: 'Feel free to refactor widely.', required: false },
  { id: 'fluff-5', label: 'Use any libraries you like.', required: false },
  { id: 'fluff-6', label: 'Add extra improvements if possible.', required: false },
];

const TRIM_STEPS = [
  'Klikaj karty, aby usunac nadmiar.',
  'Zostaw tylko Goal, Context, Constraints i Done when.',
  'Sprawdz wynik i popraw bledy.',
] as const;

const buildInitialState = (): Record<string, boolean> => {
  const state: Record<string, boolean> = {};
  PROMPT_TOKENS.forEach((token) => {
    state[token.id] = true;
  });
  return state;
};

export default function AgenticPromptTrimGame(): React.JSX.Element {
  const [activeTokens, setActiveTokens] = useState<Record<string, boolean>>(buildInitialState);
  const [checked, setChecked] = useState(false);

  const removableTokens = useMemo(
    () => PROMPT_TOKENS.filter((token) => !token.required),
    []
  );

  const requiredTokens = useMemo(
    () => PROMPT_TOKENS.filter((token) => token.required),
    []
  );

  const removedCount = removableTokens.filter((token) => !activeTokens[token.id]).length;
  const allRequiredKept = requiredTokens.every((token) => activeTokens[token.id]);
  const allFluffRemoved = removableTokens.every((token) => !activeTokens[token.id]);
  const isComplete = checked && allRequiredKept && allFluffRemoved;

  const progress = removableTokens.length
    ? Math.round((removedCount / removableTokens.length) * 100)
    : 0;

  const toggleToken = (id: string): void => {
    setActiveTokens((prev) => ({ ...prev, [id]: !prev[id] }));
    setChecked(false);
  };

  const resetGame = (): void => {
    setActiveTokens(buildInitialState());
    setChecked(false);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonVisual
        accent='rose'
        caption='Trim meter: im wiecej usuniesz, tym blizej perfekcji.'
        maxWidthClassName='max-w-full'
      >
        <PromptTrimSvg progress={progress} />
      </KangurLessonVisual>

      <KangurLessonCallout accent='rose' padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent='rose'>Prompt Trim</KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            Removed {removedCount}/{removableTokens.length}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>
          Skroc prompt, zachowujac niezmienione znaczenie.
        </KangurLessonCaption>
      </KangurLessonCallout>

      <KangurLessonCallout accent='rose' padding='sm' className='text-left'>
        <ul className='space-y-2 text-sm text-rose-950'>
          {TRIM_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </KangurLessonCallout>

      <div className={`flex flex-wrap gap-2 ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        {PROMPT_TOKENS.map((token) => {
          const isActive = activeTokens[token.id];
          const isCorrect = checked
            ? token.required
              ? isActive
              : !isActive
            : undefined;

          return (
            <button
              key={token.id}
              type='button'
              aria-pressed={isActive}
              onClick={() => toggleToken(token.id)}
              className={cn(
                'rounded-2xl border px-3 py-2 text-xs font-semibold shadow-sm transition',
                isActive ? 'bg-white' : 'bg-slate-100 text-slate-400 line-through',
                token.required ? 'border-rose-200/90 text-rose-900' : 'border-slate-200/80',
                isCorrect === undefined
                  ? ''
                  : isCorrect
                    ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200/80 bg-rose-50 text-rose-900'
              )}
            >
              {token.label}
            </button>
          );
        })}
      </div>

      <div className={`grid w-full ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-[1fr_auto]`}>
        <KangurLessonInset accent='rose'>
          <KangurLessonCaption className='text-left text-slate-700'>
            Keep: Goal + Context + Constraints + Done when. Remove reszta.
          </KangurLessonCaption>
          {checked && !isComplete ? (
            <KangurLessonCaption className='mt-2 text-left text-rose-700'>
              Jeszcze nie. Sprawdz, czy zostawiles wymagane elementy.
            </KangurLessonCaption>
          ) : null}
          {isComplete ? (
            <KangurLessonCaption className='mt-2 text-left text-emerald-700'>
              Swietnie! Prompt jest precyzyjny i krotki.
            </KangurLessonCaption>
          ) : null}
        </KangurLessonInset>
        <div className='flex flex-col gap-2'>
          <KangurButton variant={isComplete ? 'success' : 'surface'} onClick={() => setChecked(true)}>
            {isComplete ? 'Gotowe' : 'Sprawdz'}
          </KangurButton>
          <KangurButton variant='ghost' onClick={resetGame}>
            Reset
          </KangurButton>
        </div>
      </div>
    </KangurLessonStack>
  );
}

function PromptTrimSvg({ progress }: { progress: number }): React.JSX.Element {
  const progressWidth = Math.round((260 * progress) / 100);
  return (
    <svg
      aria-label='Animacja: nozyczki przycinaja prompt.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .track { fill: #f1f5f9; stroke: #e2e8f0; stroke-width: 2; }
        .progress { fill: #f472b6; transition: width 0.4s ease; }
        .scissors { animation: snip 1.8s ease-in-out infinite; transform-origin: 0 0; }
        .blade { stroke: #0f172a; stroke-width: 2; stroke-linecap: round; }
        .handle { fill: #f97316; }
        @keyframes snip {
          0%, 100% { transform: translate(40px, 22px) rotate(0deg); }
          50% { transform: translate(52px, 18px) rotate(-6deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .scissors { animation: none; }
        }
      `}</style>
      <rect className='track' height='20' rx='10' width='280' x='40' y='70' />
      <rect className='progress' height='20' rx='10' width={progressWidth} x='40' y='70' />
      <g className='scissors'>
        <circle className='handle' cx='18' cy='20' r='8' />
        <circle className='handle' cx='34' cy='34' r='8' />
        <line className='blade' x1='22' x2='54' y1='22' y2='8' />
        <line className='blade' x1='30' x2='60' y1='30' y2='20' />
      </g>
      <text x='40' y='55' fill='#64748b' fontSize='10' fontWeight='600'>Trim progress</text>
      <text x='320' y='85' fill='#0f172a' fontSize='10' fontWeight='700'>
        {progress}%
      </text>
    </svg>
  );
}
