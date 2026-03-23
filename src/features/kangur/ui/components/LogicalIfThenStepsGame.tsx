'use client';

import { useMemo, useState } from 'react';

import {
  KangurButton,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KangurCheckButton } from '@/features/kangur/ui/components/KangurCheckButton';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn } from '@/features/kangur/shared/utils';

type SlotId = 'fact' | 'rule' | 'conclusion';

export type LogicalIfThenStepsRound = {
  id: string;
  fact: string;
  rule: string;
  conclusion: string;
  distractors: string[];
  explanation: string;
};

type Card = {
  id: string;
  text: string;
};

type FeedbackKind = 'success' | 'error' | 'info' | null;

export type LogicalIfThenStepsGameCopy = {
  completion: {
    title: string;
    description: string;
    restart: string;
  };
  header: {
    stepTemplate: string;
    instruction: string;
    touchInstruction?: string;
  };
  slots: Record<
    SlotId,
    {
      label: string;
      hint: string;
    }
  >;
  deckTitle: string;
  cardAriaTemplate: string;
  feedback: {
    fillAll: string;
    successTemplate: string;
    error: string;
  };
  actions: {
    check: string;
    retry: string;
    next: string;
  };
};

type LogicalIfThenStepsGameProps = {
  rounds: LogicalIfThenStepsRound[];
  copy: LogicalIfThenStepsGameCopy;
};

const SLOT_ORDER: SlotId[] = ['fact', 'rule', 'conclusion'];

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildCards = (round: LogicalIfThenStepsRound): Card[] =>
  shuffle([
    { id: 'fact', text: round.fact },
    { id: 'rule', text: round.rule },
    { id: 'conclusion', text: round.conclusion },
    ...round.distractors.map((text, index) => ({ id: `distractor-${index}`, text })),
  ]);

const formatTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );

export default function LogicalIfThenStepsGame({
  rounds,
  copy,
}: LogicalIfThenStepsGameProps): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const [roundIndex, setRoundIndex] = useState(0);
  const [slots, setSlots] = useState<Record<SlotId, string | null>>({
    fact: null,
    rule: null,
    conclusion: null,
  });
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [completed, setCompleted] = useState(false);

  const round = rounds[roundIndex] ?? rounds[0];
  const cards = useMemo(() => (round ? buildCards(round) : []), [round]);
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const allFilled = SLOT_ORDER.every((slot) => slots[slot]);
  const isCorrect = SLOT_ORDER.every((slot) => slots[slot] === slot);
  const poolCards = cards.filter((card) => !Object.values(slots).includes(card.id));

  const resetRound = (): void => {
    setSlots({ fact: null, rule: null, conclusion: null });
    setChecked(false);
    setFeedback(null);
  };

  const handleCardClick = (cardId: string): void => {
    if (checked) return;
    const nextSlot = SLOT_ORDER.find((slot) => !slots[slot]);
    if (!nextSlot) return;
    setSlots((prev) => ({ ...prev, [nextSlot]: cardId }));
    if (feedback) setFeedback(null);
  };

  const handleSlotClick = (slot: SlotId): void => {
    if (checked) return;
    if (!slots[slot]) return;
    setSlots((prev) => ({ ...prev, [slot]: null }));
    if (feedback) setFeedback(null);
  };

  const handleCheck = (): void => {
    if (checked) return;
    if (!allFilled) {
      setFeedback('info');
      return;
    }
    setChecked(true);
    setFeedback(isCorrect ? 'success' : 'error');
  };

  const handleNext = (): void => {
    if (roundIndex + 1 >= rounds.length) {
      setCompleted(true);
      return;
    }
    setRoundIndex((prev) => prev + 1);
    resetRound();
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setCompleted(false);
    resetRound();
  };

  if (!round) {
    return <div className='sr-only' />;
  }

  if (completed) {
    return (
      <KangurInfoCard accent='emerald' tone='accent' padding='md' className='w-full text-center'>
        <p className='text-lg font-extrabold text-emerald-700'>{copy.completion.title}</p>
        <p className='mt-2 text-sm [color:var(--kangur-page-text)]'>
          {copy.completion.description}
        </p>
        <KangurButton
          className='mt-3'
          onClick={handleRestart}
          size='sm'
          type='button'
          variant='surface'
        >
          {copy.completion.restart}
        </KangurButton>
      </KangurInfoCard>
    );
  }

  return (
    <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <KangurStatusChip accent='indigo' className='px-3 py-1 text-[11px] font-extrabold' size='sm'>
          {formatTemplate(copy.header.stepTemplate, {
            current: roundIndex + 1,
            total: rounds.length,
          })}
        </KangurStatusChip>
        <span className='text-xs [color:var(--kangur-page-muted-text)]'>
          {isCoarsePointer && copy.header.touchInstruction
            ? copy.header.touchInstruction
            : copy.header.instruction}
        </span>
      </div>

      {isCoarsePointer && copy.header.touchInstruction ? (
        <p
          className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
          data-testid='logical-if-then-touch-hint'
        >
          {copy.header.touchInstruction}
        </p>
      ) : null}

      <div className='grid kangur-panel-gap sm:grid-cols-3'>
        {SLOT_ORDER.map((slot) => {
          const cardId = slots[slot];
          const card = cardId ? cardMap.get(cardId) : null;
          const slotStatus = checked ? (cardId === slot ? 'correct' : 'wrong') : 'neutral';
          const slotLabel = copy.slots[slot].label;
          const slotHint = copy.slots[slot].hint;
          const slotAriaLabel = card ? `${slotLabel}: ${card.text}` : `${slotLabel}: ${slotHint}`;

          return (
            <button
              key={slot}
              type='button'
              onClick={() => handleSlotClick(slot)}
              className={cn(
                'flex min-h-[96px] w-full flex-col gap-2 rounded-2xl border px-3 py-3 text-left transition touch-manipulation select-none',
                isCoarsePointer && 'min-h-[120px] active:scale-[0.98]',
                slotStatus === 'correct' && 'border-emerald-300 bg-emerald-50/70',
                slotStatus === 'wrong' && 'border-rose-300 bg-rose-50/70',
                slotStatus === 'neutral' && 'border-slate-200/80 bg-white/70',
                card ? 'cursor-pointer' : 'cursor-default'
              )}
              aria-label={slotAriaLabel}
            >
              <span className='text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500'>
                {slotLabel}
              </span>
              {card ? (
                <span className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {card.text}
                </span>
              ) : (
                <span className='text-xs [color:var(--kangur-page-muted-text)]'>{slotHint}</span>
              )}
            </button>
          );
        })}
      </div>

      <KangurInfoCard accent='slate' tone='neutral' padding='sm' className='w-full'>
        <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
          {copy.deckTitle}
        </p>
        <div className={KANGUR_WRAP_ROW_CLASSNAME}>
          {poolCards.map((card) => (
            <button
              key={card.id}
              type='button'
              onClick={() => handleCardClick(card.id)}
              className={cn(
                'rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-left text-xs font-semibold [color:var(--kangur-page-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md touch-manipulation select-none',
                isCoarsePointer && 'min-h-[3.5rem] px-4 active:scale-[0.98]'
              )}
              disabled={checked}
              aria-label={formatTemplate(copy.cardAriaTemplate, { text: card.text })}
            >
              {card.text}
            </button>
          ))}
        </div>
      </KangurInfoCard>

      {feedback ? (
        <KangurInfoCard
          accent={feedback === 'success' ? 'emerald' : feedback === 'error' ? 'rose' : 'amber'}
          tone='accent'
          padding='sm'
          className='w-full text-sm'
          role='status'
          aria-live='polite'
          aria-atomic='true'
        >
          {feedback === 'info'
            ? copy.feedback.fillAll
            : feedback === 'success'
              ? formatTemplate(copy.feedback.successTemplate, { explanation: round.explanation })
              : copy.feedback.error}
        </KangurInfoCard>
      ) : null}

      <div className={KANGUR_WRAP_ROW_CLASSNAME}>
        <KangurCheckButton
          onClick={handleCheck}
          size='sm'
          type='button'
          variant='primary'
          className={cn(
            'px-4 touch-manipulation select-none',
            isCoarsePointer && 'min-h-11 active:scale-[0.98]'
          )}
          feedbackTone={feedback === 'success' ? 'success' : feedback === 'error' ? 'error' : null}
        >
          {copy.actions.check}
        </KangurCheckButton>
        {checked ? (
          <>
            <KangurButton
              onClick={resetRound}
              size='sm'
              type='button'
              variant='surface'
              className={cn(
                'touch-manipulation select-none',
                isCoarsePointer && 'min-h-11 active:scale-[0.98]'
              )}
            >
              {copy.actions.retry}
            </KangurButton>
            {isCorrect ? (
              <KangurButton
                onClick={handleNext}
                size='sm'
                type='button'
                variant='surface'
                className={cn(
                  'touch-manipulation select-none',
                  isCoarsePointer && 'min-h-11 active:scale-[0.98]'
                )}
              >
                {copy.actions.next}
              </KangurButton>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
