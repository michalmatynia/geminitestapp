'use client';

import { useMemo, useState } from 'react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

import {
  getAlphabetLiteracyDataset,
  type AlphabetLiteracyMatchSetId,
} from './alphabet-literacy-stage-data';

type AlphabetLiteracyStageGameProps = {
  finishLabel?: string;
  literacyMatchSetId?: AlphabetLiteracyMatchSetId;
  onFinish?: () => void;
};

export default function AlphabetLiteracyStageGame({
  finishLabel = 'Wróć do tematów',
  literacyMatchSetId = 'alphabet_letter_matching',
  onFinish,
}: AlphabetLiteracyStageGameProps): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const dataset = useMemo(
    () => getAlphabetLiteracyDataset(literacyMatchSetId),
    [literacyMatchSetId]
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const isFinished = roundIndex >= dataset.rounds.length;
  const safeIndex = Math.min(roundIndex, Math.max(dataset.rounds.length - 1, 0));
  const round = dataset.rounds[safeIndex];
  const selectedOption = round?.options.find((option) => option.id === selectedOptionId) ?? null;
  const isCorrect = selectedOptionId === round?.correctOptionId;

  const handleSelect = (optionId: string): void => {
    if (!round || selectedOptionId) return;
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
          Koniec gry
        </KangurStatusChip>
        <div className='mt-4 text-xl font-semibold'>
          Wynik: {score}/{dataset.rounds.length}
        </div>
        <div className='mt-2 text-sm text-slate-500'>{dataset.subtitle}</div>
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
            Zagraj jeszcze raz
          </KangurButton>
        </div>
      </KangurGlassPanel>
    );
  }

  if (!round) {
    return (
      <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
        <div className='text-sm text-slate-500'>Brak danych do gry.</div>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
      <div className='flex items-center justify-between gap-3'>
        <KangurStatusChip accent='amber' size='sm'>
          {dataset.title}
        </KangurStatusChip>
        <div className='text-xs text-slate-500'>
          Runda {roundIndex + 1}/{dataset.rounds.length}
        </div>
      </div>
      <div className='mt-3 text-center text-sm text-slate-500'>{dataset.subtitle}</div>
      <div className='mt-6 flex flex-col items-center gap-3'>
        <div className='text-base font-semibold'>{round.title}</div>
        <div className='text-sm text-slate-500'>{round.instruction}</div>
        <div className='rounded-[28px] border border-amber-200/80 bg-white/90 px-8 py-6 text-center shadow-sm'>
          <div className={round.prompt.kind === 'emoji' ? 'text-5xl' : 'text-5xl font-black'}>
            {round.prompt.label}
          </div>
          {round.prompt.caption ? (
            <div className='mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700'>
              {round.prompt.caption}
            </div>
          ) : null}
        </div>
      </div>
      <div className='mt-6 grid gap-3 sm:grid-cols-2'>
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
                  ? 'touch-manipulation select-none min-h-[4rem] active:scale-[0.98]'
                  : undefined
              }
            >
              {option.label}
            </KangurButton>
          );
        })}
      </div>
      {selectedOption ? (
        <div className='mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
            {isCorrect
              ? round.correctFeedback
              : `Spróbuj jeszcze raz. Poprawna odpowiedź: ${
                  round.options.find((option) => option.id === round.correctOptionId)?.label ??
                  ''
                }`}
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
            {roundIndex + 1 >= dataset.rounds.length ? 'Zobacz wynik' : 'Dalej'}
          </KangurButton>
        </div>
      ) : null}
    </KangurGlassPanel>
  );
}
