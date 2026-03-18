'use client';

import { useEffect, useMemo, useState } from 'react';

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

import { AGENTIC_CODING_GAMES } from './AgenticCodingMiniGames.config';
import type { TrimGameConfig } from './AgenticCodingMiniGames.types';

type PromptToken = {
  id: string;
  label: string;
  required: boolean;
};

const PROMPT_TRIM_CONFIG = AGENTIC_CODING_GAMES.prompting as TrimGameConfig;

const PROMPT_TOKENS: PromptToken[] = PROMPT_TRIM_CONFIG.tokens.map((token) => ({
  id: token.id,
  label: token.text,
  required: token.keep,
}));

const TRIM_STEPS = [
  'Click tokens to remove the fluff.',
  'Keep Goal, Context, Constraints, and Done when.',
  'Check the result and correct mistakes.',
] as const;

const buildInitialState = (): Record<string, boolean> => {
  const state: Record<string, boolean> = {};
  PROMPT_TOKENS.forEach((token) => {
    state[token.id] = true;
  });
  return state;
};

type AgenticPromptTrimGameProps = {
  onFinish?: () => void;
};

export default function AgenticPromptTrimGame({
  onFinish,
}: AgenticPromptTrimGameProps): React.JSX.Element {
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

  useEffect(() => {
    if (isComplete) {
      onFinish?.();
    }
  }, [isComplete, onFinish]);

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
        accent={PROMPT_TRIM_CONFIG.accent}
        caption={PROMPT_TRIM_CONFIG.svgLabel}
        maxWidthClassName='max-w-full'
      >
        <PromptTrimSvg progress={progress} />
      </KangurLessonVisual>

      <KangurLessonCallout accent={PROMPT_TRIM_CONFIG.accent} padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent={PROMPT_TRIM_CONFIG.accent}>
            {PROMPT_TRIM_CONFIG.title}
          </KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            Removed {removedCount}/{removableTokens.length}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>
          {PROMPT_TRIM_CONFIG.prompt}
        </KangurLessonCaption>
      </KangurLessonCallout>

      <KangurLessonCallout accent={PROMPT_TRIM_CONFIG.accent} padding='sm' className='text-left'>
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
        <KangurLessonInset accent={PROMPT_TRIM_CONFIG.accent}>
          <KangurLessonCaption className='text-left text-slate-700'>
            Keep: Goal, Context, Constraints, and Done when. Remove the extras.
          </KangurLessonCaption>
          {checked && !isComplete ? (
            <KangurLessonCaption className='mt-2 text-left text-rose-700'>
              Not yet. Double-check required tokens.
            </KangurLessonCaption>
          ) : null}
          {isComplete ? (
            <KangurLessonCaption className='mt-2 text-left text-emerald-700'>
              {PROMPT_TRIM_CONFIG.success}
            </KangurLessonCaption>
          ) : null}
        </KangurLessonInset>
        <div className='flex flex-col gap-2'>
          <KangurButton variant={isComplete ? 'success' : 'surface'} onClick={() => setChecked(true)}>
            {isComplete ? 'Done' : 'Check'}
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
      aria-label='Animation: scissors trim the prompt.'
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
