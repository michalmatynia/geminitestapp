'use client';

import { useMemo, useState } from 'react';

import { KangurButton, KangurInfoCard, KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

type SlotId = 'fact' | 'rule' | 'conclusion';

type Round = {
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

const SLOT_ORDER: SlotId[] = ['fact', 'rule', 'conclusion'];

const SLOT_LABELS: Record<SlotId, string> = {
  fact: 'Fakt',
  rule: 'Jeśli… to…',
  conclusion: 'Wniosek',
};

const SLOT_HINTS: Record<SlotId, string> = {
  fact: 'Co już wiemy?',
  rule: 'Jaka zasada łączy fakty?',
  conclusion: 'Co z tego wynika?',
};

const ROUNDS: Round[] = [
  {
    id: 'birds',
    fact: 'Kanarek jest ptakiem.',
    rule: 'Jeśli coś jest ptakiem, to ma skrzydła.',
    conclusion: 'Kanarek ma skrzydła.',
    distractors: ['Kanarek pływa.', 'Kanarek jest rybą.'],
    explanation: 'Fakt spełnia warunek, więc wniosek musi być prawdziwy.',
  },
  {
    id: 'rain',
    fact: 'Dziś pada deszcz.',
    rule: 'Jeśli pada deszcz, to bierzemy parasol.',
    conclusion: 'Bierzemy parasol.',
    distractors: ['Zakładamy okulary przeciwsłoneczne.', 'Niebo jest bezchmurne.'],
    explanation: 'Gdy warunek jest spełniony, wykonujemy działanie z reguły.',
  },
  {
    id: 'even',
    fact: 'Liczba 8 jest parzysta.',
    rule: 'Jeśli liczba jest parzysta, to dzieli się przez 2.',
    conclusion: '8 dzieli się przez 2.',
    distractors: ['8 jest liczbą pierwszą.', '8 dzieli się przez 3.'],
    explanation: 'Parzystość oznacza podzielność przez 2, więc wniosek jest poprawny.',
  },
];

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildCards = (round: Round): Card[] =>
  shuffle([
    { id: 'fact', text: round.fact },
    { id: 'rule', text: round.rule },
    { id: 'conclusion', text: round.conclusion },
    ...round.distractors.map((text, index) => ({ id: `distractor-${index}`, text })),
  ]);

export default function LogicalIfThenStepsGame(): React.JSX.Element {
  const [roundIndex, setRoundIndex] = useState(0);
  const [slots, setSlots] = useState<Record<SlotId, string | null>>({
    fact: null,
    rule: null,
    conclusion: null,
  });
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [completed, setCompleted] = useState(false);

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;
  const cards = useMemo(() => buildCards(round), [round]);
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
    if (roundIndex + 1 >= ROUNDS.length) {
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

  if (completed) {
    return (
      <KangurInfoCard accent='emerald' tone='accent' padding='md' className='w-full text-center'>
        <p className='text-lg font-extrabold text-emerald-700'>Brawo! 🧠</p>
        <p className='mt-2 text-sm [color:var(--kangur-page-text)]'>
          Umiesz już budować wnioski krok po kroku.
        </p>
        <KangurButton className='mt-3' onClick={handleRestart} size='sm' type='button' variant='surface'>
          Zagraj jeszcze raz
        </KangurButton>
      </KangurInfoCard>
    );
  }

  return (
    <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <KangurStatusChip accent='indigo' className='px-3 py-1 text-[11px] font-extrabold' size='sm'>
          Krok {roundIndex + 1} / {ROUNDS.length}
        </KangurStatusChip>
        <span className='text-xs [color:var(--kangur-page-muted-text)]'>
          Kliknij karty i ułóż: fakt → reguła → wniosek
        </span>
      </div>

      <div className='grid kangur-panel-gap sm:grid-cols-3'>
        {SLOT_ORDER.map((slot) => {
          const cardId = slots[slot];
          const card = cardId ? cardMap.get(cardId) : null;
          const slotStatus = checked ? (cardId === slot ? 'correct' : 'wrong') : 'neutral';
          const slotLabel = SLOT_LABELS[slot];
          const slotHint = SLOT_HINTS[slot];
          const slotAriaLabel = card
            ? `${slotLabel}: ${card.text}`
            : `${slotLabel}: ${slotHint}`;

          return (
            <button
              key={slot}
              type='button'
              onClick={() => handleSlotClick(slot)}
              className={cn(
                'flex min-h-[96px] w-full flex-col gap-2 rounded-2xl border px-3 py-3 text-left transition',
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
                <span className='text-xs [color:var(--kangur-page-muted-text)]'>
                  {slotHint}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <KangurInfoCard accent='slate' tone='neutral' padding='sm' className='w-full'>
        <p className='text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2'>Karty</p>
        <div className='flex flex-wrap gap-2'>
          {poolCards.map((card) => (
            <button
              key={card.id}
              type='button'
              onClick={() => handleCardClick(card.id)}
              className='rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-left text-xs font-semibold [color:var(--kangur-page-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md'
              disabled={checked}
              aria-label={`Karta: ${card.text}`}
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
            ? 'Uzupełnij wszystkie kroki, aby sprawdzić wniosek.'
            : feedback === 'success'
              ? `Świetnie! ${round.explanation}`
              : 'Spróbuj jeszcze raz — zamień karty na właściwe miejsca.'}
        </KangurInfoCard>
      ) : null}

      <div className='flex flex-wrap gap-2'>
        <KangurButton
          onClick={handleCheck}
          size='sm'
          type='button'
          variant='primary'
          className='px-4'
        >
          Sprawdź
        </KangurButton>
        {checked ? (
          <>
            <KangurButton onClick={resetRound} size='sm' type='button' variant='surface'>
              Spróbuj ponownie
            </KangurButton>
            {isCorrect ? (
              <KangurButton onClick={handleNext} size='sm' type='button' variant='surface'>
                Dalej
              </KangurButton>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
