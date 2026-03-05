import { useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

type AddingBallGameProps = {
  onFinish: () => void;
};

type BallItem = {
  id: string;
  num: number;
  color: string;
};

type RoundMode = 'complete_equation' | 'group_sum' | 'pick_answer';

type CompleteEquationRound = {
  mode: 'complete_equation';
  a: number;
  b: number;
  target: number;
};

type GroupSumRound = {
  mode: 'group_sum';
  a: number;
  b: number;
  target: number;
};

type PickAnswerRound = {
  mode: 'pick_answer';
  a: number;
  b: number;
  correct: number;
  choices: number[];
};

type Round = CompleteEquationRound | GroupSumRound | PickAnswerRound;

type CompleteEquationState = {
  pool: BallItem[];
  slotA: BallItem[];
  slotB: BallItem[];
};

type GroupSumState = {
  pool: BallItem[];
  group1: BallItem[];
  group2: BallItem[];
};

type CompleteSlotId = keyof CompleteEquationState;
type GroupSlotId = keyof GroupSumState;

type SlotZoneProps = {
  id: 'slotA' | 'slotB';
  items: BallItem[];
  label: string;
  checked: boolean;
  correct: boolean;
};

type BallProps = {
  ball: BallItem;
  small?: boolean;
};

const BALL_COLORS = [
  'bg-red-400',
  'bg-blue-400',
  'bg-green-400',
  'bg-yellow-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-orange-400',
  'bg-teal-400',
  'bg-indigo-400',
  'bg-rose-400',
] as const;

const MODES: RoundMode[] = ['complete_equation', 'group_sum', 'pick_answer'];
const TOTAL_ROUNDS = 6;

function createBalls(count: number): BallItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ball-${i}`,
    num: i + 1,
    color: BALL_COLORS[i % BALL_COLORS.length] ?? BALL_COLORS[0],
  }));
}

function reorderWithinList<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const next = [...list];
  const [moved] = next.splice(startIndex, 1);
  if (moved === undefined) {
    return list;
  }
  next.splice(endIndex, 0, moved);
  return next;
}

function moveBetweenLists<T>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } {
  const sourceNext = [...source];
  const destinationNext = [...destination];
  const [moved] = sourceNext.splice(sourceIndex, 1);
  if (moved === undefined) {
    return { source, destination };
  }
  destinationNext.splice(destinationIndex, 0, moved);
  return { source: sourceNext, destination: destinationNext };
}

function isCompleteSlotId(id: string): id is CompleteSlotId {
  return id === 'pool' || id === 'slotA' || id === 'slotB';
}

function isGroupSlotId(id: string): id is GroupSlotId {
  return id === 'pool' || id === 'group1' || id === 'group2';
}

function generateRound(mode: RoundMode): Round {
  const random1to9 = (): number => Math.floor(Math.random() * 9) + 1;

  if (mode === 'complete_equation') {
    const a = random1to9();
    const b = random1to9();
    return { mode, a, b, target: a + b };
  }

  if (mode === 'group_sum') {
    const target = Math.floor(Math.random() * 8) + 4;
    const a = Math.floor(Math.random() * (target - 1)) + 1;
    const b = target - a;
    return { mode, target, a, b };
  }

  const a = random1to9();
  const b = random1to9();
  const correct = a + b;
  const wrongs = new Set<number>();

  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * 5) + 1;
    const sign = Math.random() < 0.5 ? 1 : -1;
    const wrong = correct + delta * sign;
    if (wrong > 0 && wrong !== correct) {
      wrongs.add(wrong);
    }
  }

  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return { mode, a, b, correct, choices };
}

function CompleteEquation({
  round,
  onResult,
}: {
  round: CompleteEquationRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const [state, setState] = useState<CompleteEquationState>(() => ({
    pool: createBalls(round.a + round.b),
    slotA: [],
    slotB: [],
  }));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;

    const { source, destination } = result;
    if (!destination) return;
    if (!isCompleteSlotId(source.droppableId) || !isCompleteSlotId(destination.droppableId)) {
      return;
    }
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

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

  const check = (): void => {
    const ok = state.slotA.length === round.a && state.slotB.length === round.b;
    setCorrect(ok);
    setChecked(true);
    setTimeout(() => onResult(ok), 1400);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className='flex flex-col items-center gap-4 w-full'>
        <p className='text-lg font-bold text-gray-700'>
          Przeciągnij piłki tak, żeby uzupełnić równanie:
        </p>
        <div className='flex items-center gap-3 flex-wrap justify-center'>
          <SlotZone
            id='slotA'
            items={state.slotA}
            label={`Grupa A (${round.a})`}
            checked={checked}
            correct={correct}
          />
          <span className='text-3xl font-extrabold text-gray-500'>+</span>
          <SlotZone
            id='slotB'
            items={state.slotB}
            label={`Grupa B (${round.b})`}
            checked={checked}
            correct={correct}
          />
          <span className='text-3xl font-extrabold text-gray-500'>= {round.target}</span>
        </div>

        <Droppable droppableId='pool' direction='horizontal'>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className='flex flex-wrap gap-2 bg-gray-100 rounded-2xl p-3 min-h-[60px] w-full max-w-xs justify-center'
            >
              {state.pool.map((ball, i) => (
                <Draggable key={ball.id} draggableId={ball.id} index={i} isDragDisabled={checked}>
                  {(draggableProvided) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                    >
                      <Ball ball={ball} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {!checked && (
          <button
            onClick={check}
            disabled={state.slotA.length === 0 || state.slotB.length === 0}
            className='px-6 py-2 rounded-2xl bg-orange-400 text-white font-bold disabled:opacity-40 hover:bg-orange-500 transition'
          >
            Sprawdź ✓
          </button>
        )}
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-xl font-extrabold ${correct ? 'text-green-600' : 'text-red-500'}`}
          >
            {correct ? '🎉 Brawo!' : `❌ Nie tym razem! A=${round.a}, B=${round.b}`}
          </motion.div>
        )}
      </div>
    </DragDropContext>
  );
}

function SlotZone({ id, items, label, checked, correct }: SlotZoneProps): React.JSX.Element {
  return (
    <Droppable droppableId={id} direction='horizontal'>
      {(provided, snapshot) => (
        <div>
          <p className='text-xs text-gray-400 text-center mb-1'>{label}</p>
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-wrap gap-1 min-w-[60px] min-h-[52px] rounded-xl border-2 p-2 transition-all ${
              snapshot.isDraggingOver
                ? 'border-orange-400 bg-orange-50'
                : checked
                  ? correct
                    ? 'border-green-400 bg-green-50'
                    : 'border-red-400 bg-red-50'
                  : 'border-dashed border-gray-300 bg-white'
            }`}
          >
            {items.map((ball, i) => (
              <Draggable key={ball.id} draggableId={ball.id} index={i} isDragDisabled={checked}>
                {(draggableProvided) => (
                  <div
                    ref={draggableProvided.innerRef}
                    {...draggableProvided.draggableProps}
                    {...draggableProvided.dragHandleProps}
                  >
                    <Ball ball={ball} small />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}

function GroupSum({
  round,
  onResult,
}: {
  round: GroupSumRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const total = round.a + round.b;
  const [state, setState] = useState<GroupSumState>(() => ({
    pool: createBalls(total),
    group1: [],
    group2: [],
  }));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;

    const { source, destination } = result;
    if (!destination) return;
    if (!isGroupSlotId(source.droppableId) || !isGroupSlotId(destination.droppableId)) {
      return;
    }

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

  const check = (): void => {
    const group1Count = state.group1.length;
    const group2Count = state.group2.length;
    const ok =
      (group1Count === round.a && group2Count === round.b) ||
      (group1Count === round.b && group2Count === round.a);
    setCorrect(ok);
    setChecked(true);
    setTimeout(() => onResult(ok), 1400);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className='flex flex-col items-center gap-4 w-full'>
        <p className='text-lg font-bold text-gray-700'>
          Podziel {total} piłek na dwie grupy sumujące się do{' '}
          <span className='text-orange-500'>{round.target}</span>
        </p>

        <div className='flex gap-4 flex-wrap justify-center'>
          {([
            { id: 'group1', label: 'Grupa 1' },
            { id: 'group2', label: 'Grupa 2' },
          ] as const).map((group) => (
            <Droppable key={group.id} droppableId={group.id} direction='horizontal'>
              {(provided, snapshot) => (
                <div>
                  <p className='text-xs text-gray-400 text-center mb-1'>{group.label}</p>
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-wrap gap-1 min-w-[80px] min-h-[52px] rounded-xl border-2 p-2 transition-all ${
                      snapshot.isDraggingOver
                        ? 'border-orange-400 bg-orange-50'
                        : checked
                          ? correct
                            ? 'border-green-400 bg-green-50'
                            : 'border-red-400 bg-red-50'
                          : 'border-dashed border-gray-300 bg-white'
                    }`}
                  >
                    {state[group.id].map((ball, i) => (
                      <Draggable
                        key={ball.id}
                        draggableId={ball.id}
                        index={i}
                        isDragDisabled={checked}
                      >
                        {(draggableProvided) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            {...draggableProvided.dragHandleProps}
                          >
                            <Ball ball={ball} small />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>

        <Droppable droppableId='pool' direction='horizontal'>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className='flex flex-wrap gap-2 bg-gray-100 rounded-2xl p-3 min-h-[60px] w-full max-w-xs justify-center'
            >
              {state.pool.map((ball, i) => (
                <Draggable key={ball.id} draggableId={ball.id} index={i} isDragDisabled={checked}>
                  {(draggableProvided) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                    >
                      <Ball ball={ball} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {!checked && (
          <button
            onClick={check}
            disabled={state.group1.length === 0 || state.group2.length === 0}
            className='px-6 py-2 rounded-2xl bg-orange-400 text-white font-bold disabled:opacity-40 hover:bg-orange-500 transition'
          >
            Sprawdź ✓
          </button>
        )}
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-xl font-extrabold ${correct ? 'text-green-600' : 'text-red-500'}`}
          >
            {correct ? '🎉 Brawo!' : `❌ Nie tym razem! (${round.a} i ${round.b})`}
          </motion.div>
        )}
      </div>
    </DragDropContext>
  );
}

function PickAnswer({
  round,
  onResult,
}: {
  round: PickAnswerRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const [dropped, setDropped] = useState<BallItem | null>(null);
  const [checked, setChecked] = useState(false);

  const balls: BallItem[] = round.choices.map((num, i) => ({
    id: `ans-${i}`,
    num,
    color: BALL_COLORS[i % BALL_COLORS.length] ?? BALL_COLORS[0],
  }));

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;
    if (result.destination?.droppableId !== 'answer-slot') return;

    const ball = balls.find((entry) => entry.id === result.draggableId);
    if (!ball) return;

    setDropped(ball);
    const ok = ball.num === round.correct;
    setChecked(true);
    setTimeout(() => onResult(ok), 1400);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className='flex flex-col items-center gap-6 w-full'>
        <p className='text-2xl font-extrabold text-gray-700'>
          {round.a} + {round.b} = <span className='text-orange-400'>?</span>
        </p>
        <p className='text-sm text-gray-500'>
          Przeciągnij piłkę z właściwą odpowiedzią do pola poniżej
        </p>

        <Droppable droppableId='answer-slot'>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all ${
                snapshot.isDraggingOver
                  ? 'border-orange-400 bg-orange-50 scale-110'
                  : checked
                    ? dropped?.num === round.correct
                      ? 'border-green-400 bg-green-50'
                      : 'border-red-400 bg-red-50'
                    : 'border-dashed border-gray-300 bg-white'
              }`}
            >
              {dropped ? (
                <div
                  className={`w-16 h-16 rounded-full ${dropped.color} flex items-center justify-center`}
                >
                  <span className='text-white font-extrabold text-xl'>{dropped.num}</span>
                </div>
              ) : (
                <span className='text-gray-300 text-3xl'>?</span>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-xl font-extrabold ${dropped?.num === round.correct ? 'text-green-600' : 'text-red-500'}`}
          >
            {dropped?.num === round.correct ? '🎉 Brawo!' : `❌ Odpowiedź: ${round.correct}`}
          </motion.div>
        )}

        <Droppable droppableId='balls-pool' direction='horizontal'>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className='flex gap-3 flex-wrap justify-center'
            >
              {balls.map((ball, i) => (
                <Draggable key={ball.id} draggableId={ball.id} index={i} isDragDisabled={checked}>
                  {(draggableProvided) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                    >
                      <Ball ball={ball} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}

function Ball({ ball, small = false }: BallProps): React.JSX.Element {
  const sizeClass = small ? 'w-9 h-9 text-sm' : 'w-14 h-14 text-lg';

  return (
    <div
      className={`${sizeClass} rounded-full ${ball.color} flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing select-none`}
    >
      <span className='text-white font-extrabold'>{ball.num}</span>
    </div>
  );
}

export default function AddingBallGame({ onFinish }: AddingBallGameProps): React.JSX.Element {
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState<Round>(() => generateRound(MODES[0] ?? 'complete_equation'));

  const handleResult = (correct: boolean): void => {
    const nextScore = correct ? score + 1 : score;
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      setScore(nextScore);
      setDone(true);
      return;
    }

    const nextMode = MODES[(roundIdx + 1) % MODES.length] ?? 'complete_equation';
    setRound(generateRound(nextMode));
    setScore(nextScore);
    setRoundIdx(roundIdx + 1);
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='flex flex-col items-center gap-4 bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm'
      >
        <div className='text-6xl'>{percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>
          Wynik: {score}/{TOTAL_ROUNDS}
        </h2>
        <div className='w-full bg-gray-100 rounded-full h-3'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8 }}
            className='h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {percent === 100
            ? 'Idealnie! Jesteś mistrzem dodawania!'
            : percent >= 60
              ? 'Świetna robota!'
              : 'Nie poddawaj się!'}
        </p>
        <div className='flex gap-3 w-full'>
          <button
            onClick={() => {
              setRoundIdx(0);
              setScore(0);
              setDone(false);
              setRound(generateRound(MODES[0] ?? 'complete_equation'));
            }}
            className='flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
          >
            <RefreshCw className='w-4 h-4' /> Jeszcze raz
          </button>
          <button
            onClick={onFinish}
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-bold shadow hover:opacity-90 transition'
          >
            Wróć do lekcji
          </button>
        </div>
      </motion.div>
    );
  }

  const modeLabelByMode: Record<RoundMode, string> = {
    complete_equation: 'Uzupełnij równanie',
    group_sum: 'Podziel na grupy',
    pick_answer: 'Wybierz odpowiedź',
  };
  const modeLabel = modeLabelByMode[round.mode];

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <div className='flex items-center gap-2 w-full'>
        <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
          <div
            style={{ width: `${(roundIdx / TOTAL_ROUNDS) * 100}%` }}
            className='h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full transition-all duration-500'
          />
        </div>
        <span className='text-xs font-bold text-gray-400'>
          {roundIdx + 1}/{TOTAL_ROUNDS}
        </span>
      </div>

      <div className='w-full bg-white rounded-2xl shadow p-5'>
        <p className='text-xs font-bold text-orange-500 uppercase tracking-wide mb-3'>{modeLabel}</p>
        <AnimatePresence mode='wait'>
          <motion.div
            key={roundIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {round.mode === 'complete_equation' && (
              <CompleteEquation round={round} onResult={handleResult} />
            )}
            {round.mode === 'group_sum' && <GroupSum round={round} onResult={handleResult} />}
            {round.mode === 'pick_answer' && <PickAnswer round={round} onResult={handleResult} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
