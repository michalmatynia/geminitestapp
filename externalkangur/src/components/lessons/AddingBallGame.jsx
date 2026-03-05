import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

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
];

function generateRound(mode) {
  const r = () => Math.floor(Math.random() * 9) + 1;
  if (mode === 'complete_equation') {
    // ___ + ___ = target: drag numbered balls into slots
    const a = r(),
      b = r();
    return { mode, a, b, target: a + b };
  } else if (mode === 'group_sum') {
    // drag balls into two groups that each sum to target
    const target = Math.floor(Math.random() * 8) + 4; // 4-11
    const a = Math.floor(Math.random() * (target - 1)) + 1;
    const b = target - a;
    return { mode, target, a, b };
  } else {
    // drag the correct answer ball
    const a = r(),
      b = mode === 'double' ? Math.floor(Math.random() * 90) + 10 : r();
    const correct = a + b;
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
      if (w > 0 && w !== correct) wrongs.add(w);
    }
    const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
    return { mode: 'pick_answer', a, b, correct, choices };
  }
}

// --- Mode 1: Complete equation by dragging balls into slots ---
function CompleteEquation({ round, onResult }) {
  const balls = Array.from({ length: round.a + round.b }, (_, i) => ({
    id: `ball-${i}`,
    num: i + 1,
    color: BALL_COLORS[i % BALL_COLORS.length],
  }));

  const [state, setState] = useState({
    pool: balls,
    slotA: [],
    slotB: [],
  });
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const onDragEnd = (result) => {
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    const getList = (id) => {
      if (id === 'pool') return [...state.pool];
      if (id === 'slotA') return [...state.slotA];
      return [...state.slotB];
    };
    const setList = (id, list) => {
      if (id === 'pool') return { ...state, pool: list };
      if (id === 'slotA') return { ...state, slotA: list };
      return { ...state, slotB: list };
    };

    const src = getList(source.droppableId);
    const [moved] = src.splice(source.index, 1);
    const dst = getList(destination.droppableId);
    dst.splice(destination.index, 0, moved);

    const newState = {
      pool:
        source.droppableId === 'pool' ? src : destination.droppableId === 'pool' ? dst : state.pool,
      slotA:
        source.droppableId === 'slotA'
          ? src
          : destination.droppableId === 'slotA'
            ? dst
            : state.slotA,
      slotB:
        source.droppableId === 'slotB'
          ? src
          : destination.droppableId === 'slotB'
            ? dst
            : state.slotB,
    };
    setState(newState);
  };

  const check = () => {
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
                  {(prov) => (
                    <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
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

function SlotZone({ id, items, label, checked, correct }) {
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
                {(prov) => (
                  <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
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

// --- Mode 2: Group sum (drag into two groups) ---
function GroupSum({ round, onResult }) {
  const total = round.a + round.b;
  const balls = Array.from({ length: total }, (_, i) => ({
    id: `ball-${i}`,
    num: i + 1,
    color: BALL_COLORS[i % BALL_COLORS.length],
  }));

  const [state, setState] = useState({ pool: balls, group1: [], group2: [] });
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const onDragEnd = (result) => {
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;

    const lists = { pool: [...state.pool], group1: [...state.group1], group2: [...state.group2] };
    const [moved] = lists[source.droppableId].splice(source.index, 1);
    lists[destination.droppableId].splice(destination.index, 0, moved);
    setState(lists);
  };

  const check = () => {
    const s1 = state.group1.length,
      s2 = state.group2.length;
    const ok = (s1 === round.a && s2 === round.b) || (s1 === round.b && s2 === round.a);
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
          {['group1', 'group2'].map((gid, gi) => (
            <Droppable key={gid} droppableId={gid} direction='horizontal'>
              {(provided, snapshot) => (
                <div>
                  <p className='text-xs text-gray-400 text-center mb-1'>Grupa {gi + 1}</p>
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
                    {state[gid].map((ball, i) => (
                      <Draggable
                        key={ball.id}
                        draggableId={ball.id}
                        index={i}
                        isDragDisabled={checked}
                      >
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
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
                  {(prov) => (
                    <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
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

// --- Mode 3: Drag the correct answer ball ---
function PickAnswer({ round, onResult }) {
  const [dropped, setDropped] = useState(null);
  const [checked, setChecked] = useState(false);

  const balls = round.choices.map((n, i) => ({
    id: `ans-${i}`,
    num: n,
    color: BALL_COLORS[i % BALL_COLORS.length],
  }));

  const onDragEnd = (result) => {
    if (checked) return;
    if (result.destination?.droppableId === 'answer-slot') {
      const ball = balls.find((b) => b.id === result.draggableId);
      setDropped(ball);
      const ok = ball.num === round.correct;
      setChecked(true);
      setTimeout(() => onResult(ok), 1400);
    }
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
                  {(prov) => (
                    <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
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

function Ball({ ball, small }) {
  const size = small ? 'w-9 h-9 text-sm' : 'w-14 h-14 text-lg';
  return (
    <div
      className={`${size} rounded-full ${ball.color} flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing select-none`}
    >
      <span className='text-white font-extrabold'>{ball.num}</span>
    </div>
  );
}

const MODES = ['complete_equation', 'group_sum', 'pick_answer'];
const TOTAL_ROUNDS = 6;

export default function AddingBallGame({ onFinish }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(() => generateRound(MODES[0]));

  const handleResult = (correct) => {
    const newScore = correct ? score + 1 : score;
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      setScore(newScore);
      setDone(true);
    } else {
      const nextMode = MODES[(roundIdx + 1) % MODES.length];
      setRound(generateRound(nextMode));
      setScore(newScore);
      setRoundIdx(roundIdx + 1);
    }
  };

  if (done) {
    const pct = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='flex flex-col items-center gap-4 bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm'
      >
        <div className='text-6xl'>{pct === 100 ? '🏆' : pct >= 60 ? '🌟' : '💪'}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>
          Wynik: {score}/{TOTAL_ROUNDS}
        </h2>
        <div className='w-full bg-gray-100 rounded-full h-3'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8 }}
            className='h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {pct === 100
            ? 'Idealnie! Jesteś mistrzem dodawania!'
            : pct >= 60
              ? 'Świetna robota!'
              : 'Nie poddawaj się!'}
        </p>
        <div className='flex gap-3 w-full'>
          <button
            onClick={() => {
              setRoundIdx(0);
              setScore(0);
              setDone(false);
              setRound(generateRound(MODES[0]));
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

  const modeLabel = ['Uzupełnij równanie', 'Podziel na grupy', 'Wybierz odpowiedź'][
    roundIdx % MODES.length
  ];

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
        <p className='text-xs font-bold text-orange-500 uppercase tracking-wide mb-3'>
          {modeLabel}
        </p>
        <AnimatePresence mode='wait'>
          <motion.div
            key={roundIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {roundIdx % MODES.length === 0 && (
              <CompleteEquation round={round} onResult={handleResult} />
            )}
            {roundIdx % MODES.length === 1 && <GroupSum round={round} onResult={handleResult} />}
            {roundIdx % MODES.length === 2 && <PickAnswer round={round} onResult={handleResult} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
