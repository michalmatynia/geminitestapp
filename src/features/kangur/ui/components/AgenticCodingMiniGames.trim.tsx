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
import { KANGUR_PANEL_GAP_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';

import type { TrimGameConfig, TrimGameToken } from './AgenticCodingMiniGames.types';

const buildTrimState = (tokens: TrimGameToken[]): Record<string, boolean> => {
  const base: Record<string, boolean> = {};
  tokens.forEach((token) => {
    base[token.id] = false;
  });
  return base;
};

export function AgenticTrimGame({
  accent,
  config,
}: {
  accent: KangurAccent;
  config: TrimGameConfig;
}): React.JSX.Element {
  const [removed, setRemoved] = useState<Record<string, boolean>>(() => buildTrimState(config.tokens));
  const [checked, setChecked] = useState(false);

  const removableCount = useMemo(
    () => config.tokens.filter((token) => !token.keep).length,
    [config.tokens]
  );
  const isRemoved = (id: string): boolean => removed[id] ?? false;
  const removedCount = config.tokens.filter((token) => !token.keep && isRemoved(token.id)).length;
  const keptTokens = config.tokens.filter((token) => !isRemoved(token.id));
  const preview = keptTokens.map((token) => token.text).join(' ');
  const allCorrect = config.tokens.every((token) =>
    token.keep ? !isRemoved(token.id) : isRemoved(token.id)
  );
  const progress = removableCount === 0 ? 100 : Math.round((removedCount / removableCount) * 100);

  const toggleToken = (id: string): void => {
    setRemoved((prev) => ({ ...prev, [id]: !prev[id] }));
    setChecked(false);
  };

  const reset = (): void => {
    setRemoved(buildTrimState(config.tokens));
    setChecked(false);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonVisual
        accent={accent}
        caption={config.svgLabel}
        maxWidthClassName='max-w-full'
      >
        <TrimGameSvg />
      </KangurLessonVisual>
      <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent={accent}>{config.title}</KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            Removed {removedCount}/{removableCount}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>{config.prompt}</KangurLessonCaption>
      </KangurLessonCallout>
      <div className='soft-card border border-slate-200/80 bg-white px-4 py-4'>
        <div className='flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500'>
          <span>Extended prompt</span>
          <span>{progress}% trimmed</span>
        </div>
        <div className='mt-3 flex flex-wrap gap-2'>
          {config.tokens.map((token) => (
            <TrimTokenButton
              key={token.id}
              checked={checked}
              removed={isRemoved(token.id)}
              token={token}
              onToggle={toggleToken}
            />
          ))}
        </div>
        <div className='mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-200'>
          <div
            className='h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-sky-300 transition-all'
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} lg:grid-cols-[1.2fr_0.8fr]`}>
        <KangurLessonInset accent={accent} className='flex flex-col gap-2'>
          <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
            Clean prompt preview
          </p>
          <p className='text-sm font-semibold text-slate-900'>{preview}</p>
        </KangurLessonInset>
        <KangurLessonInset accent={accent} className='flex flex-col gap-3'>
          <KangurLessonCaption className='text-left text-slate-700'>
            Click every extra word. Keep the core contract blocks intact.
          </KangurLessonCaption>
          <div className='flex flex-wrap items-center gap-2'>
            <KangurButton
              variant={checked && allCorrect ? 'success' : 'surface'}
              onClick={() => setChecked(true)}
            >
              {checked && allCorrect ? 'Perfect' : 'Check'}
            </KangurButton>
            <KangurButton variant='surface' onClick={reset}>
              Reset
            </KangurButton>
          </div>
          {checked && allCorrect ? (
            <KangurLessonCaption className='text-left text-emerald-800'>
              {config.success}
            </KangurLessonCaption>
          ) : null}
          {checked && !allCorrect ? (
            <KangurLessonCaption className='text-left text-rose-700'>
              Some tokens are missing or extra. Try trimming again.
            </KangurLessonCaption>
          ) : null}
        </KangurLessonInset>
      </div>
    </KangurLessonStack>
  );
}

function TrimTokenButton({
  checked,
  removed,
  token,
  onToggle,
}: {
  checked: boolean;
  removed: boolean;
  token: TrimGameToken;
  onToggle: (id: string) => void;
}): React.JSX.Element {
  const isCorrect = token.keep ? !removed : removed;
  const baseStyle = 'group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-all';
  const stateStyle = checked
    ? isCorrect
      ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
      : 'border-rose-200/80 bg-rose-50 text-rose-900'
    : removed
      ? 'border-slate-200/80 bg-slate-100 text-slate-400'
      : 'border-slate-200/80 bg-white text-slate-900 hover:border-slate-300/80';
  const removalStyle = removed ? 'line-through' : '';

  return (
    <button
      type='button'
      aria-pressed={removed}
      onClick={() => onToggle(token.id)}
      className={cn(baseStyle, stateStyle, removalStyle)}
    >
      <span>{token.text}</span>
      <span
        className={cn(
          'text-[10px] font-bold transition',
          removed ? 'text-slate-400' : 'text-slate-300 group-hover:text-slate-500'
        )}
      >
        x
      </span>
    </button>
  );
}

function TrimGameSvg(): React.JSX.Element {
  return (
    <svg
      aria-label='Animation: scissors trim the prompt.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .sheet { fill: #ffffff; stroke: #e2e8f0; stroke-width: 2; }
        .line { stroke: #cbd5f5; stroke-width: 4; stroke-linecap: round; }
        .cut { stroke: #f43f5e; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 10 8; animation: dash 3s linear infinite; }
        .scissor { fill: #f472b6; stroke: #be185d; stroke-width: 2; transform-box: fill-box; transform-origin: center; animation: snip 3s ease-in-out infinite; }
        .hinge { fill: #be185d; }
        @keyframes dash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 36; }
        }
        @keyframes snip {
          0%, 100% { transform: translate(30px, 26px) rotate(-4deg); }
          50% { transform: translate(210px, 26px) rotate(6deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cut, .scissor { animation: none; }
        }
      `}</style>
      <rect className='sheet' height='96' rx='18' width='300' x='30' y='22' />
      <line className='line' x1='60' x2='300' y1='56' y2='56' />
      <line className='line' x1='60' x2='270' y1='80' y2='80' />
      <line className='line' x1='60' x2='240' y1='104' y2='104' />
      <line className='cut' x1='70' x2='290' y1='80' y2='80' />
      <g className='scissor'>
        <circle className='hinge' cx='66' cy='60' r='5' />
        <path d='M66 60 L52 45' />
        <path d='M66 60 L52 75' />
        <circle cx='46' cy='40' r='8' fill='none' stroke='#be185d' strokeWidth='2' />
        <circle cx='46' cy='80' r='8' fill='none' stroke='#be185d' strokeWidth='2' />
      </g>
    </svg>
  );
}
