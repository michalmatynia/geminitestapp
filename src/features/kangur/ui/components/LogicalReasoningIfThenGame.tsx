import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { KangurButton, KangurInfoCard, KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

import type { DropResult } from '@hello-pangea/dnd';

type IfThenCase = {
  id: string;
  rule: string;
  fact: string;
  conclusion: string;
  valid: boolean;
  explanation: string;
};

type LogicalReasoningIfThenGameProps = {
  cases: IfThenCase[];
};

type ZoneId = 'pool' | 'valid' | 'invalid';

type GameState = {
  pool: IfThenCase[];
  valid: IfThenCase[];
  invalid: IfThenCase[];
};

type CardStatus = 'neutral' | 'correct' | 'wrong';

const dragPortal = typeof document === 'undefined' ? null : document.body;

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const reorderWithinList = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const next = [...list];
  const [moved] = next.splice(startIndex, 1);
  if (moved === undefined) return list;
  next.splice(endIndex, 0, moved);
  return next;
};

const moveBetweenLists = <T,>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } => {
  const sourceNext = [...source];
  const destinationNext = [...destination];
  const [moved] = sourceNext.splice(sourceIndex, 1);
  if (moved === undefined) return { source, destination };
  destinationNext.splice(destinationIndex, 0, moved);
  return { source: sourceNext, destination: destinationNext };
};

const buildInitialState = (cases: IfThenCase[]): GameState => ({
  pool: shuffle(cases),
  valid: [],
  invalid: [],
});

const isZoneId = (value: string): value is ZoneId =>
  value === 'pool' || value === 'valid' || value === 'invalid';

const zoneTitles: Record<ZoneId, string> = {
  pool: 'Karty',
  valid: 'Wynika',
  invalid: 'Nie wynika',
};

const zoneHints: Record<ZoneId, string> = {
  pool: 'Przeciagnij karte do odpowiedniego pola.',
  valid: 'Wniosek wynika z reguly i faktu.',
  invalid: 'Wniosek nie wynika z reguly.',
};

const zoneHints: Record<ZoneId, string> = {
  pool: 'Przeciagnij karte do odpowiedniego pola.',
  valid: 'Wniosek wynika z reguly i faktu.',
  invalid: 'Wniosek nie wynika z reguly.',
};

const zoneAccents: Record<ZoneId, KangurAccent> = {
  pool: 'slate',
  valid: 'emerald',
  invalid: 'rose',
};

const zoneBorder: Record<ZoneId, string> = {
  pool: 'border-slate-200/70',
  valid: 'border-emerald-200/70',
  invalid: 'border-rose-200/70',
};

const statusAccent: Record<CardStatus, KangurAccent> = {
  neutral: 'slate',
  correct: 'emerald',
  wrong: 'rose',
};

const statusChip: Record<CardStatus, string> = {
  neutral: '',
  correct: 'Dobrze',
  wrong: 'Zle',
};

function getCardStatus(item: IfThenCase, zoneId: ZoneId, checked: boolean): CardStatus {
  if (!checked || zoneId === 'pool') return 'neutral';
  const correctZone: ZoneId = item.valid ? 'valid' : 'invalid';
  return zoneId === correctZone ? 'correct' : 'wrong';
}

function DraggableCase({
  item,
  index,
  zoneId,
  checked,
}: {
  item: IfThenCase;
  index: number;
  zoneId: ZoneId;
  checked: boolean;
}): React.ReactElement | React.ReactPortal {
  const status = getCardStatus(item, zoneId, checked);
  const accent = statusAccent[status];
  const tone = status === 'neutral' ? 'neutral' : 'accent';

  const card = (
    <KangurInfoCard
      accent={accent}
      tone={tone}
      padding='sm'
      className={cn(
        'w-full text-left transition-all',
        status === 'neutral' ? 'border-slate-200/60' : 'border-transparent'
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='space-y-2'>
          <div className='rounded-xl border border-slate-200/60 bg-white/70 px-2 py-1'>
            <p className='text-[10px] font-semibold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
              Jesli...
            </p>
            <p className='text-sm font-bold [color:var(--kangur-page-text)]'>{item.rule}</p>
          </div>
          <div className='space-y-1 text-xs'>
            <p className='[color:var(--kangur-page-muted-text)]'>
              <span className='font-semibold text-slate-700'>Fakt:</span> {item.fact}
            </p>
            <p className='[color:var(--kangur-page-text)]'>
              <span className='font-semibold text-slate-700'>Wniosek:</span> {item.conclusion}
            </p>
          </div>
        </div>
        {status !== 'neutral' ? (
          <KangurStatusChip
            accent={accent}
            className='px-2 py-1 text-[10px] font-bold'
            size='sm'
          >
            {statusChip[status]}
          </KangurStatusChip>
        ) : null}
      </div>
      {checked ? (
        <p className='mt-2 text-xs [color:var(--kangur-page-muted-text)]'>{item.explanation}</p>
      ) : null}
    </KangurInfoCard>
  );

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={checked}>
      {(provided, snapshot) => {
        const content = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className='w-full cursor-grab active:cursor-grabbing'
          >
            {card}
          </div>
        );

        if (snapshot.isDragging && dragPortal) {
          return createPortal(content, dragPortal);
        }

        return content;
      }}
    </Draggable>
  );
}

export default function LogicalReasoningIfThenGame({
  cases,
}: LogicalReasoningIfThenGameProps): React.JSX.Element {
  const [state, setState] = useState<GameState>(() => buildInitialState(cases));
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState(false);

  const total = cases.length;
  const allPlaced = state.pool.length === 0;
  const placed = total - state.pool.length;

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;
    if (!isZoneId(source.droppableId) || !isZoneId(destination.droppableId)) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;

    if (sourceId === destinationId) {
      setState((prev) => ({
        ...prev,
        [sourceId]: reorderWithinList(prev[sourceId], source.index, destination.index),
      }));
      return;
    }

    setState((prev) => {
      const moved = moveBetweenLists(
        prev[sourceId],
        prev[destinationId],
        source.index,
        destination.index
      );
      return {
        ...prev,
        [sourceId]: moved.source,
        [destinationId]: moved.destination,
      };
    });
  };

  const evaluate = (): void => {
    if (!allPlaced) return;
    const correctInValid = state.valid.filter((item) => item.valid).length;
    const correctInInvalid = state.invalid.filter((item) => !item.valid).length;
    const totalCorrect = correctInValid + correctInInvalid;
    setScore(totalCorrect);
    setChecked(true);
    setAttempted(true);
  };

  const reset = (): void => {
    setState(buildInitialState(cases));
    setChecked(false);
    setAttempted(false);
    setScore(0);
  };

  const summaryLabel = useMemo(() => {
    if (!attempted) return '';
    if (score === total) return 'Super! Wszystko poprawnie.';
    if (score >= Math.max(1, Math.floor(total * 0.6))) return 'Dobra robota! Popraw błędy.';
    return 'Spróbuj jeszcze raz i sprawdź wskazówki.';
  }, [attempted, score, total]);

  const summaryAccent = useMemo<KangurAccent>(() => {
    if (!attempted) return 'slate';
    if (score === total) return 'emerald';
    if (score >= Math.max(1, Math.floor(total * 0.6))) return 'amber';
    return 'rose';
  }, [attempted, score, total]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className='flex w-full flex-col gap-4'>
        <KangurInfoCard accent='indigo' tone='muted' padding='sm' className='w-full'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <p className='text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500'>
                Gra logiczna
              </p>
              <p className='text-sm font-bold [color:var(--kangur-page-text)]'>
                Jesli... to... czy wniosek wynika?
              </p>
              <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
                Przeciagnij kazda karte do pola, gdzie wniosek <b>wynika</b> lub <b>nie wynika</b> z reguly.
              </p>
            </div>
            <KangurStatusChip accent='indigo' className='px-3 py-1 text-xs font-bold' size='sm'>
              Umieszczone: {placed}/{total}
            </KangurStatusChip>
          </div>
        </KangurInfoCard>

        <div className='grid w-full gap-3 sm:grid-cols-2'>
          {(['valid', 'invalid'] as const).map((zoneId) => (
            <Droppable key={zoneId} droppableId={zoneId}>
              {(provided, snapshot) => {
                const accent = zoneAccents[zoneId];
                const tone = snapshot.isDraggingOver ? 'accent' : 'muted';
                return (
                  <KangurInfoCard
                    ref={provided.innerRef}
                    accent={accent}
                    tone={tone}
                    padding='sm'
                    dashed
                    className={cn(
                      'min-h-[170px] w-full transition-all',
                      zoneBorder[zoneId],
                      snapshot.isDraggingOver && 'scale-[1.01]'
                    )}
                    {...provided.droppableProps}
                  >
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <p className='text-xs font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {zoneTitles[zoneId]}
                      </p>
                      <KangurStatusChip
                        accent={accent}
                        size='sm'
                        className='px-2 py-1 text-[10px] font-bold'
                      >
                        {state[zoneId].length}
                      </KangurStatusChip>
                    </div>
                    <p className='mb-2 text-[11px] [color:var(--kangur-page-muted-text)]'>
                      {zoneHints[zoneId]}
                    </p>
                    <div className='flex flex-col gap-2'>
                      {state[zoneId].map((item, index) => (
                        <DraggableCase
                          key={item.id}
                          item={item}
                          index={index}
                          zoneId={zoneId}
                          checked={checked}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  </KangurInfoCard>
                );
              }}
            </Droppable>
          ))}
        </div>

        <Droppable droppableId='pool'>
          {(provided, snapshot) => (
            <KangurInfoCard
              ref={provided.innerRef}
              accent='slate'
              tone={snapshot.isDraggingOver ? 'accent' : 'muted'}
              padding='sm'
              dashed
              className={cn('min-h-[150px] w-full', zoneBorder.pool)}
              {...provided.droppableProps}
            >
              <div className='mb-2 flex items-center justify-between gap-2'>
                <p className='text-xs font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {zoneTitles.pool}
                </p>
                <KangurStatusChip
                  accent='slate'
                  size='sm'
                  className='px-2 py-1 text-[10px] font-bold'
                >
                  {state.pool.length}
                </KangurStatusChip>
              </div>
              <p className='mb-2 text-[11px] [color:var(--kangur-page-muted-text)]'>
                {zoneHints.pool}
              </p>
              <div className='flex flex-col gap-2'>
                {state.pool.map((item, index) => (
                  <DraggableCase
                    key={item.id}
                    item={item}
                    index={index}
                    zoneId='pool'
                    checked={checked}
                  />
                ))}
                {provided.placeholder}
              </div>
            </KangurInfoCard>
          )}
        </Droppable>

        <div className='flex flex-wrap items-center gap-3'>
          <KangurButton
            disabled={!allPlaced || checked}
            onClick={evaluate}
            size='sm'
            variant='primary'
          >
            Sprawdź
          </KangurButton>
          <KangurButton onClick={reset} size='sm' type='button' variant='surface'>
            Reset
          </KangurButton>
        </div>

        {attempted ? (
          <KangurInfoCard
            accent={summaryAccent}
            tone='accent'
            padding='sm'
            className='w-full text-sm'
          >
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <span className='font-bold [color:var(--kangur-page-text)]'>
                Wynik: {score}/{total}
              </span>
              <KangurStatusChip
                accent={summaryAccent}
                size='sm'
                className='px-2 py-1 text-[10px] font-bold'
              >
                {summaryLabel}
              </KangurStatusChip>
            </div>
          </KangurInfoCard>
        ) : null}
      </div>
    </DragDropContext>
  );
}
