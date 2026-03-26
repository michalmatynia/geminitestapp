'use client';

import { useState } from 'react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

type ColorHarmonySwatch = {
  className: string;
  label: string;
};

type ColorHarmonyOption = {
  id: string;
  label: string;
  swatches: readonly [ColorHarmonySwatch, ColorHarmonySwatch];
};

type ColorHarmonyRound = {
  id: string;
  title: string;
  instruction: string;
  sceneLabel: string;
  sceneSwatches: readonly ColorHarmonySwatch[];
  options: readonly ColorHarmonyOption[];
  correctOptionId: string;
  correctFeedback: string;
};

const SWATCHES = {
  amber: {
    className: 'bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400',
    label: 'amber yellow',
  },
  coral: {
    className: 'bg-gradient-to-br from-rose-300 via-orange-400 to-red-400',
    label: 'coral red',
  },
  cream: {
    className: 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100',
    label: 'soft cream',
  },
  emerald: {
    className: 'bg-gradient-to-br from-emerald-200 via-emerald-400 to-lime-400',
    label: 'emerald green',
  },
  pink: {
    className: 'bg-gradient-to-br from-pink-200 via-rose-300 to-pink-400',
    label: 'pink',
  },
  sky: {
    className: 'bg-gradient-to-br from-sky-200 via-sky-400 to-cyan-500',
    label: 'sky blue',
  },
  violet: {
    className: 'bg-gradient-to-br from-violet-200 via-violet-400 to-fuchsia-400',
    label: 'violet',
  },
  orange: {
    className: 'bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400',
    label: 'orange',
  },
} as const;

const COLOR_HARMONY_ROUNDS: readonly ColorHarmonyRound[] = [
  {
    id: 'warm-pair',
    title: 'Warm and sunny',
    instruction: 'Choose the pair that feels warm, bright, and full of sunshine.',
    sceneLabel: 'Sunny poster',
    sceneSwatches: [SWATCHES.coral, SWATCHES.orange, SWATCHES.amber],
    options: [
      {
        id: 'warm-sunshine',
        label: 'Yellow + orange',
        swatches: [SWATCHES.amber, SWATCHES.orange],
      },
      {
        id: 'cool-breeze',
        label: 'Blue + green',
        swatches: [SWATCHES.sky, SWATCHES.emerald],
      },
      {
        id: 'dreamy-night',
        label: 'Pink + violet',
        swatches: [SWATCHES.pink, SWATCHES.violet],
      },
    ],
    correctOptionId: 'warm-sunshine',
    correctFeedback: 'Yes. Neighboring warm colors make the palette feel sunny and lively.',
  },
  {
    id: 'cool-pair',
    title: 'Cool and calm',
    instruction: 'Pick the pair that feels restful and fresh.',
    sceneLabel: 'Quiet pond',
    sceneSwatches: [SWATCHES.sky, SWATCHES.emerald, SWATCHES.violet],
    options: [
      {
        id: 'berry-party',
        label: 'Pink + orange',
        swatches: [SWATCHES.pink, SWATCHES.orange],
      },
      {
        id: 'cool-pond',
        label: 'Blue + green',
        swatches: [SWATCHES.sky, SWATCHES.emerald],
      },
      {
        id: 'soft-sunrise',
        label: 'Cream + amber',
        swatches: [SWATCHES.cream, SWATCHES.amber],
      },
    ],
    correctOptionId: 'cool-pond',
    correctFeedback: 'Correct. Blue and green feel cool, smooth, and peaceful together.',
  },
  {
    id: 'neighbor-pair',
    title: 'Friendly neighbors',
    instruction: 'Choose the pair that sits close together and blends smoothly.',
    sceneLabel: 'Storybook cover',
    sceneSwatches: [SWATCHES.pink, SWATCHES.violet, SWATCHES.sky],
    options: [
      {
        id: 'sun-and-sea',
        label: 'Amber + blue',
        swatches: [SWATCHES.amber, SWATCHES.sky],
      },
      {
        id: 'soft-dream',
        label: 'Pink + violet',
        swatches: [SWATCHES.pink, SWATCHES.violet],
      },
      {
        id: 'forest-fire',
        label: 'Green + coral',
        swatches: [SWATCHES.emerald, SWATCHES.coral],
      },
    ],
    correctOptionId: 'soft-dream',
    correctFeedback: 'Exactly. Pink and violet are close neighbors, so they feel gentle together.',
  },
  {
    id: 'balance-pair',
    title: 'Bright and soft balance',
    instruction: 'Pick one bright color with one quiet helper color.',
    sceneLabel: 'Toy shelf label',
    sceneSwatches: [SWATCHES.orange, SWATCHES.cream, SWATCHES.amber],
    options: [
      {
        id: 'balanced-pair',
        label: 'Orange + cream',
        swatches: [SWATCHES.orange, SWATCHES.cream],
      },
      {
        id: 'double-bright',
        label: 'Coral + orange',
        swatches: [SWATCHES.coral, SWATCHES.orange],
      },
      {
        id: 'double-cool',
        label: 'Blue + violet',
        swatches: [SWATCHES.sky, SWATCHES.violet],
      },
    ],
    correctOptionId: 'balanced-pair',
    correctFeedback: 'Nice. A soft helper color lets the brighter one stand out without feeling noisy.',
  },
];

const SwatchPair = ({
  swatches,
  size = 'md',
}: {
  swatches: readonly ColorHarmonySwatch[];
  size?: 'sm' | 'md';
}): React.JSX.Element => {
  const dotClassName = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';

  return (
    <div className='flex items-center justify-center gap-2'>
      {swatches.map((swatch) => (
        <span
          key={`${swatch.label}-${size}`}
          aria-label={swatch.label}
          className={`${dotClassName} rounded-full border border-white/80 shadow-inner ${swatch.className}`}
        />
      ))}
    </div>
  );
};

export default function ColorHarmonyStageGame({
  finishLabel = 'Back to topics',
  onFinish,
}: {
  finishLabel?: string;
  onFinish?: () => void;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const isFinished = roundIndex >= COLOR_HARMONY_ROUNDS.length;
  const safeRoundIndex = Math.min(roundIndex, Math.max(COLOR_HARMONY_ROUNDS.length - 1, 0));
  const round = COLOR_HARMONY_ROUNDS[safeRoundIndex];
  const selectedOption = round?.options.find((option) => option.id === selectedOptionId) ?? null;
  const isCorrect = selectedOptionId === round?.correctOptionId;
  const correctOption =
    round?.options.find((option) => option.id === round.correctOptionId) ?? null;

  const handleSelect = (optionId: string): void => {
    if (!round || selectedOptionId) {
      return;
    }

    setSelectedOptionId(optionId);
    if (optionId === round.correctOptionId) {
      setScore((current) => current + 1);
    }
  };

  const handleNext = (): void => {
    setSelectedOptionId(null);
    setRoundIndex((current) => current + 1);
  };

  const handleRestart = (): void => {
    setSelectedOptionId(null);
    setRoundIndex(0);
    setScore(0);
  };

  if (isFinished) {
    return (
      <KangurGlassPanel className='w-full text-center' padding='lg' surface='playField'>
        <KangurStatusChip accent='emerald' size='sm'>
          Palette complete
        </KangurStatusChip>
        <div className='mt-4 text-xl font-semibold'>
          You matched {score}/{COLOR_HARMONY_ROUNDS.length} color scenes
        </div>
        <div className='mt-2 text-sm text-slate-500'>
          Warm, cool, neighboring, and balanced pairs all use the same harmony rules.
        </div>
        <div className='mt-5 flex flex-wrap justify-center gap-3'>
          {onFinish ? (
            <KangurButton
              variant='primary'
              onClick={onFinish}
              className={
                isCoarsePointer
                  ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]'
                  : undefined
              }
            >
              {finishLabel}
            </KangurButton>
          ) : null}
          <KangurButton
            variant={onFinish ? 'surface' : 'primary'}
            onClick={handleRestart}
            className={
              isCoarsePointer
                ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]'
                : undefined
            }
          >
            Play again
          </KangurButton>
        </div>
      </KangurGlassPanel>
    );
  }

  if (!round) {
    return (
      <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
        <div className='text-sm text-slate-500'>No color rounds are available right now.</div>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
      <div className='flex items-center justify-between gap-3'>
        <KangurStatusChip accent='rose' size='sm'>
          Color harmony studio
        </KangurStatusChip>
        <div className='text-xs text-slate-500'>
          Round {roundIndex + 1}/{COLOR_HARMONY_ROUNDS.length}
        </div>
      </div>
      <div className='mt-3 text-center text-sm text-slate-500'>{round.title}</div>
      <div className='mt-6 flex flex-col items-center gap-4 rounded-[32px] border border-rose-100/80 bg-white/90 px-6 py-6 shadow-sm'>
        <div className='text-xs font-semibold uppercase tracking-[0.18em] text-rose-500'>
          {round.sceneLabel}
        </div>
        <SwatchPair swatches={round.sceneSwatches} />
        <div className='max-w-xl text-center text-sm text-slate-600'>{round.instruction}</div>
      </div>
      <div className='mt-6 grid gap-3 sm:grid-cols-3'>
        {round.options.map((option) => {
          const variant =
            selectedOptionId === option.id
              ? option.id === round.correctOptionId
                ? 'success'
                : 'warning'
              : 'surface';

          return (
            <KangurButton
              key={option.id}
              fullWidth
              variant={variant}
              onClick={() => handleSelect(option.id)}
              className={
                isCoarsePointer
                  ? 'touch-manipulation select-none min-h-[7rem] active:scale-[0.98]'
                  : 'min-h-[7rem]'
              }
            >
              <div className='flex w-full flex-col items-center gap-3'>
                <SwatchPair swatches={option.swatches} size='sm' />
                <span className='text-center text-sm font-semibold'>{option.label}</span>
              </div>
            </KangurButton>
          );
        })}
      </div>
      {selectedOption ? (
        <div className='mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
            {isCorrect
              ? round.correctFeedback
              : `Try again. A better match is ${correctOption?.label ?? 'the neighboring pair'}.`}
          </KangurStatusChip>
          <KangurButton
            variant='primary'
            onClick={handleNext}
            className={
              isCoarsePointer
                ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]'
                : undefined
            }
          >
            {roundIndex + 1 >= COLOR_HARMONY_ROUNDS.length ? 'See result' : 'Next palette'}
          </KangurButton>
        </div>
      ) : null}
    </KangurGlassPanel>
  );
}
