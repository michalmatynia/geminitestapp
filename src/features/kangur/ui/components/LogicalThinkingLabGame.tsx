import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useMemo, useState } from 'react';

import { KangurButton, KangurInfoCard, KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

import type { DropResult } from '@hello-pangea/dnd';

type StageId = 'pattern' | 'classify' | 'analogy';

type PatternZoneId = 'pattern-pool' | 'pattern-slot-1' | 'pattern-slot-2';
type ClassifyZoneId = 'classify-pool' | 'classify-yes' | 'classify-no';

type PatternToken = {
  id: string;
  label: string;
  kind: 'triangle' | 'circle' | 'square';
};

type ClassifyItem = {
  id: string;
  label: string;
  target: 'yes' | 'no';
};

type AnalogyRound = {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
  correctId: string;
  explanation: string;
};

type FeedbackKind = 'success' | 'error' | 'info' | null;

const STAGES: StageId[] = ['pattern', 'classify', 'analogy'];

const PATTERN_SEQUENCE = ['🔺', '🔵', '🔺', '🔵'];
const PATTERN_SOLUTION: PatternToken['kind'][] = ['triangle', 'circle'];
const PATTERN_TOKENS: PatternToken[] = [
  { id: 'triangle-1', label: '🔺', kind: 'triangle' },
  { id: 'circle-1', label: '🔵', kind: 'circle' },
  { id: 'square-1', label: '🟡', kind: 'square' },
];

const CLASSIFY_ITEMS: ClassifyItem[] = [
  { id: 'butterfly', label: '🦋', target: 'yes' },
  { id: 'bird', label: '🐦', target: 'yes' },
  { id: 'bee', label: '🐝', target: 'yes' },
  { id: 'dog', label: '🐶', target: 'no' },
  { id: 'cat', label: '🐱', target: 'no' },
  { id: 'fish', label: '🐟', target: 'no' },
];

const ANALOGY_ROUNDS: AnalogyRound[] = [
  {
    id: 'bird',
    prompt: 'Ptak : lata = Ryba : ?',
    options: [
      { id: 'swims', label: 'pływa' },
      { id: 'runs', label: 'biega' },
      { id: 'sleeps', label: 'śpi' },
    ],
    correctId: 'swims',
    explanation: 'Ryby poruszają się w wodzie, więc „pływa” pasuje do relacji.',
  },
  {
    id: 'day',
    prompt: 'Dzień : słońce = Noc : ?',
    options: [
      { id: 'moon', label: 'księżyc' },
      { id: 'rain', label: 'deszcz' },
      { id: 'cloud', label: 'chmura' },
    ],
    correctId: 'moon',
    explanation: 'W nocy kojarzymy światło z księżycem.',
  },
];

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildPatternState = (): Record<PatternZoneId, PatternToken[]> => ({
  'pattern-pool': shuffle(PATTERN_TOKENS),
  'pattern-slot-1': [],
  'pattern-slot-2': [],
});

const buildClassifyState = (): Record<ClassifyZoneId, ClassifyItem[]> => ({
  'classify-pool': shuffle(CLASSIFY_ITEMS),
  'classify-yes': [],
  'classify-no': [],
});

const isPatternZone = (value: string): value is PatternZoneId =>
  value === 'pattern-pool' || value === 'pattern-slot-1' || value === 'pattern-slot-2';

const isClassifyZone = (value: string): value is ClassifyZoneId =>
  value === 'classify-pool' || value === 'classify-yes' || value === 'classify-no';

const moveItem = <T,>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } => {
  const sourceNext = [...source];
  const destinationNext = [...destination];
  const [moved] = sourceNext.splice(sourceIndex, 1);
  if (!moved) return { source, destination };
  destinationNext.splice(destinationIndex, 0, moved);
  return { source: sourceNext, destination: destinationNext };
};

export default function LogicalThinkingLabGame(): React.JSX.Element {
  const [stageIndex, setStageIndex] = useState(0);
  const [patternState, setPatternState] = useState(buildPatternState);
  const [patternChecked, setPatternChecked] = useState(false);
  const [classifyState, setClassifyState] = useState(buildClassifyState);
  const [classifyChecked, setClassifyChecked] = useState(false);
  const [analogyIndex, setAnalogyIndex] = useState(0);
  const [analogySelected, setAnalogySelected] = useState<string | null>(null);
  const [analogyChecked, setAnalogyChecked] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [completed, setCompleted] = useState(false);

  const stage = STAGES[stageIndex] ?? 'pattern';
  const analogyRound = ANALOGY_ROUNDS[analogyIndex] ?? ANALOGY_ROUNDS[0]!;

  const patternSolutionIds = useMemo(() => {
    const slot1 = patternState['pattern-slot-1'][0]?.kind ?? null;
    const slot2 = patternState['pattern-slot-2'][0]?.kind ?? null;
    return [slot1, slot2];
  }, [patternState]);

  const patternFilled =
    patternState['pattern-slot-1'].length === 1 && patternState['pattern-slot-2'].length === 1;
  const patternCorrect =
    patternFilled &&
    patternSolutionIds[0] === PATTERN_SOLUTION[0] &&
    patternSolutionIds[1] === PATTERN_SOLUTION[1];

  const classifyFilled = classifyState['classify-pool'].length === 0;
  const classifyCorrect =
    classifyFilled &&
    [...classifyState['classify-yes'], ...classifyState['classify-no']].every((item) =>
      item.target === 'yes'
        ? classifyState['classify-yes'].some((entry) => entry.id === item.id)
        : classifyState['classify-no'].some((entry) => entry.id === item.id)
    );

  const analogyCorrect = analogySelected === analogyRound.correctId;

  const handlePatternDragEnd = (result: DropResult): void => {
    if (patternChecked) return;
    const { source, destination } = result;
    if (!destination) return;
    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;
    if (!isPatternZone(sourceId) || !isPatternZone(destinationId)) return;
    if (sourceId === destinationId && source.index === destination.index) return;

    setPatternState((prev) => {
      const sourceList = prev[sourceId];
      const destinationList = prev[destinationId];
      let nextSource = sourceList;
      let nextDestination = destinationList;

      if (destinationId !== 'pattern-pool' && destinationList.length > 0) {
        const [existing] = destinationList;
        const pool = [...prev['pattern-pool'], ...(existing ? [existing] : [])];
        nextDestination = [];
        nextSource = sourceList;
        return {
          ...prev,
          'pattern-pool': pool,
          [destinationId]: nextDestination,
          [sourceId]: nextSource,
        };
      }

      const moved = moveItem(sourceList, destinationList, source.index, destination.index);
      return {
        ...prev,
        [sourceId]: moved.source,
        [destinationId]: moved.destination,
      };
    });
    setFeedback(null);
  };

  const handleClassifyDragEnd = (result: DropResult): void => {
    if (classifyChecked) return;
    const { source, destination } = result;
    if (!destination) return;
    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;
    if (!isClassifyZone(sourceId) || !isClassifyZone(destinationId)) return;
    if (sourceId === destinationId && source.index === destination.index) return;

    setClassifyState((prev) => {
      const moved = moveItem(
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
    setFeedback(null);
  };

  const resetPattern = (): void => {
    setPatternState(buildPatternState());
    setPatternChecked(false);
    setFeedback(null);
  };

  const resetClassify = (): void => {
    setClassifyState(buildClassifyState());
    setClassifyChecked(false);
    setFeedback(null);
  };

  const resetAnalogy = (): void => {
    setAnalogySelected(null);
    setAnalogyChecked(false);
    setFeedback(null);
  };

  const goNextStage = (): void => {
    if (stageIndex + 1 >= STAGES.length) {
      setCompleted(true);
      return;
    }
    setStageIndex((prev) => prev + 1);
    setFeedback(null);
  };

  const handleCheck = (): void => {
    if (stage === 'pattern') {
      if (!patternFilled) {
        setFeedback('info');
        return;
      }
      setPatternChecked(true);
      setFeedback(patternCorrect ? 'success' : 'error');
      return;
    }
    if (stage === 'classify') {
      if (!classifyFilled) {
        setFeedback('info');
        return;
      }
      setClassifyChecked(true);
      setFeedback(classifyCorrect ? 'success' : 'error');
      return;
    }
    if (stage === 'analogy') {
      if (!analogySelected) {
        setFeedback('info');
        return;
      }
      setAnalogyChecked(true);
      setFeedback(analogyCorrect ? 'success' : 'error');
    }
  };

  const handleAnalogyNext = (): void => {
    if (analogyIndex + 1 >= ANALOGY_ROUNDS.length) {
      goNextStage();
      return;
    }
    setAnalogyIndex((prev) => prev + 1);
    resetAnalogy();
  };

  if (completed) {
    return (
      <KangurInfoCard accent='emerald' tone='accent' padding='md' className='w-full text-center'>
        <p className='text-lg font-extrabold text-emerald-700'>Brawo! 🧠</p>
        <p className='mt-2 text-sm [color:var(--kangur-page-text)]'>
          Rozwiązałeś wszystkie zadania logicznego laboratorium.
        </p>
        <KangurButton onClick={() => {
          setCompleted(false);
          setStageIndex(0);
          resetPattern();
          resetClassify();
          setAnalogyIndex(0);
          resetAnalogy();
        }} size='sm' type='button' variant='surface' className='mt-3'>
          Zagraj jeszcze raz
        </KangurButton>
      </KangurInfoCard>
    );
  }

  return (
    <div className='flex w-full flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <KangurStatusChip accent='violet' className='px-3 py-1 text-[11px] font-extrabold' size='sm'>
          Etap {stageIndex + 1} / {STAGES.length}
        </KangurStatusChip>
        <span className='text-xs [color:var(--kangur-page-muted-text)]'>
          Przeciągnij i klikaj, aby ukończyć misję.
        </span>
      </div>

      {stage === 'pattern' ? (
        <div className='flex flex-col gap-3'>
          <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>
            Uzupełnij wzorzec: znajdź dwie następne figury.
          </p>
          <DragDropContext onDragEnd={handlePatternDragEnd}>
            <div className='flex flex-wrap items-center justify-center gap-2 text-2xl'>
              {PATTERN_SEQUENCE.map((token, index) => (
                <span key={`${token}-${index}`} className='rounded-xl bg-white/80 px-3 py-2 shadow-sm'>
                  {token}
                </span>
              ))}
              {(['pattern-slot-1', 'pattern-slot-2'] as PatternZoneId[]).map((slotId) => (
                <Droppable key={slotId} droppableId={slotId} direction='horizontal'>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed text-xl',
                        snapshot.isDraggingOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
                      )}
                    >
                      {patternState[slotId].map((token, tokenIndex) => (
                        <Draggable
                          key={token.id}
                          draggableId={token.id}
                          index={tokenIndex}
                          isDragDisabled={patternChecked}
                        >
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className='text-2xl'
                            >
                              {token.label}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {patternState[slotId].length === 0 ? '?' : null}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
            <Droppable droppableId='pattern-pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex flex-wrap items-center justify-center gap-2 rounded-2xl border px-3 py-3',
                    snapshot.isDraggingOver ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-200/70'
                  )}
                >
                  {patternState['pattern-pool'].map((token, index) => (
                    <Draggable
                      key={token.id}
                      draggableId={token.id}
                      index={index}
                      isDragDisabled={patternChecked}
                    >
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className='rounded-xl bg-white px-3 py-2 text-2xl shadow-sm'
                        >
                          {token.label}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      ) : null}

      {stage === 'classify' ? (
        <div className='flex flex-col gap-3'>
          <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>
            Posegreguj obrazki według cechy: <b>ma skrzydła</b>.
          </p>
          <DragDropContext onDragEnd={handleClassifyDragEnd}>
            <div className='grid gap-3 sm:grid-cols-2'>
              {(['classify-yes', 'classify-no'] as ClassifyZoneId[]).map((zoneId) => (
                <Droppable key={zoneId} droppableId={zoneId} direction='horizontal'>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex min-h-[120px] flex-col gap-2 rounded-2xl border px-3 py-3',
                        zoneId === 'classify-yes'
                          ? 'border-emerald-200/70'
                          : 'border-rose-200/70',
                        snapshot.isDraggingOver && 'bg-amber-50/70'
                      )}
                    >
                      <span className='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>
                        {zoneId === 'classify-yes' ? 'Ma skrzydła' : 'Nie ma skrzydeł'}
                      </span>
                      <div className='flex flex-wrap gap-2 text-2xl'>
                        {classifyState[zoneId].map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={index}
                            isDragDisabled={classifyChecked}
                          >
                            {(dragProvided) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className='rounded-xl bg-white px-3 py-2 shadow-sm'
                              >
                                {item.label}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
            <Droppable droppableId='classify-pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex flex-wrap items-center justify-center gap-2 rounded-2xl border px-3 py-3',
                    snapshot.isDraggingOver ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200/70'
                  )}
                >
                  {classifyState['classify-pool'].map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                      isDragDisabled={classifyChecked}
                    >
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className='rounded-xl bg-white px-3 py-2 text-2xl shadow-sm'
                        >
                          {item.label}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      ) : null}

      {stage === 'analogy' ? (
        <div className='flex flex-col gap-3'>
          <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>
            Uzupełnij analogię.
          </p>
          <KangurInfoCard accent='violet' tone='neutral' padding='sm' className='w-full text-center'>
            <p className='text-base font-bold text-violet-700'>{analogyRound.prompt}</p>
          </KangurInfoCard>
          <div className='grid gap-2 sm:grid-cols-3'>
            {analogyRound.options.map((option) => {
              const isSelected = analogySelected === option.id;
              const isCorrect = analogyChecked && option.id === analogyRound.correctId;
              const isWrong = analogyChecked && isSelected && option.id !== analogyRound.correctId;

              return (
                <button
                  key={option.id}
                  type='button'
                  onClick={() => {
                    if (analogyChecked) return;
                    setAnalogySelected(option.id);
                    setFeedback(null);
                  }}
                  className={cn(
                    'rounded-2xl border px-3 py-2 text-sm font-semibold transition',
                    isSelected ? 'border-violet-300 bg-violet-50' : 'border-slate-200/70 bg-white',
                    isCorrect && 'border-emerald-300 bg-emerald-50',
                    isWrong && 'border-rose-300 bg-rose-50'
                  )}
                  aria-label={`Opcja: ${option.label}`}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {analogyChecked ? (
            <p className='text-xs [color:var(--kangur-page-muted-text)]'>
              {analogyRound.explanation}
            </p>
          ) : null}
        </div>
      ) : null}

      {feedback ? (
        <KangurInfoCard
          accent={feedback === 'success' ? 'emerald' : feedback === 'error' ? 'rose' : 'amber'}
          tone='accent'
          padding='sm'
          className='w-full text-sm'
        >
          {feedback === 'info'
            ? 'Uzupełnij zadanie, aby sprawdzić odpowiedź.'
            : feedback === 'success'
              ? 'Świetnie! Tak trzymać.'
              : 'Ups, spróbuj jeszcze raz.'}
        </KangurInfoCard>
      ) : null}

      <div className='flex flex-wrap gap-2'>
        <KangurButton onClick={handleCheck} size='sm' type='button' variant='primary'>
          Sprawdź
        </KangurButton>
        {stage === 'pattern' && patternChecked ? (
          <>
            <KangurButton onClick={resetPattern} size='sm' type='button' variant='surface'>
              Spróbuj ponownie
            </KangurButton>
            {patternCorrect ? (
              <KangurButton onClick={goNextStage} size='sm' type='button' variant='surface'>
                Dalej
              </KangurButton>
            ) : null}
          </>
        ) : null}
        {stage === 'classify' && classifyChecked ? (
          <>
            <KangurButton onClick={resetClassify} size='sm' type='button' variant='surface'>
              Spróbuj ponownie
            </KangurButton>
            {classifyCorrect ? (
              <KangurButton onClick={goNextStage} size='sm' type='button' variant='surface'>
                Dalej
              </KangurButton>
            ) : null}
          </>
        ) : null}
        {stage === 'analogy' && analogyChecked ? (
          <>
            <KangurButton onClick={resetAnalogy} size='sm' type='button' variant='surface'>
              Spróbuj ponownie
            </KangurButton>
            {analogyCorrect ? (
              <KangurButton onClick={handleAnalogyNext} size='sm' type='button' variant='surface'>
                {analogyIndex + 1 >= ANALOGY_ROUNDS.length ? 'Zakończ' : 'Dalej'}
              </KangurButton>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
