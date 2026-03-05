import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { addXp, XP_REWARDS, loadProgress } from '@/features/kangur/ui/services/progress';

const TASKS = [
  { hours: 3, minutes: 0 },
  { hours: 7, minutes: 30 },
  { hours: 1, minutes: 15 },
  { hours: 10, minutes: 45 },
  { hours: 6, minutes: 0 },
  { hours: 4, minutes: 20 },
  { hours: 9, minutes: 35 },
  { hours: 12, minutes: 0 },
  { hours: 2, minutes: 50 },
  { hours: 11, minutes: 25 },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

function angleTo5MinStep(angleDeg) {
  // Snap to nearest 5-minute increment (30-degree steps for minutes)
  const steps = Math.round((((angleDeg % 360) + 360) % 360) / 30);
  return (steps % 12) * 5;
}

function angleToHour(angleDeg, minutes) {
  // Hour hand moves 30deg per hour + 0.5deg per minute
  const normalized = ((angleDeg % 360) + 360) % 360;
  let hour = Math.round(normalized / 30) % 12;
  if (hour === 0) hour = 12;
  return hour;
}

function DraggableClock({ targetHours, targetMinutes, onSubmit }) {
  const [hourAngle, setHourAngle] = useState(0); // degrees, 0 = 12 o'clock
  const [minuteAngle, setMinuteAngle] = useState(0);
  const svgRef = useRef(null);
  const dragging = useRef(null); // 'hour' | 'minute' | null

  const getAngle = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  const onMouseDown = (hand) => (e) => {
    e.preventDefault();
    dragging.current = hand;
  };

  const onMove = useCallback(
    (e) => {
      if (!dragging.current) return;
      const angle = getAngle(e);
      if (dragging.current === 'minute') {
        // Snap to nearest 5-min step (30 deg)
        const snapped = Math.round(angle / 30) * 30;
        setMinuteAngle(snapped % 360);
      } else if (dragging.current === 'hour') {
        // Snap to nearest hour (30 deg)
        const snapped = Math.round(angle / 30) * 30;
        setHourAngle(snapped % 360);
      }
    },
    [getAngle]
  );

  const onUp = useCallback(() => {
    dragging.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [onMove, onUp]);

  const displayMinutes = angleTo5MinStep(minuteAngle);
  const displayHour = angleToHour(hourAngle, displayMinutes);

  const handleCheck = () => {
    onSubmit(displayHour, displayMinutes);
  };

  const hourHandX = 100 + 48 * Math.cos((hourAngle - 90) * (Math.PI / 180));
  const hourHandY = 100 + 48 * Math.sin((hourAngle - 90) * (Math.PI / 180));
  const minuteHandX = 100 + 68 * Math.cos((minuteAngle - 90) * (Math.PI / 180));
  const minuteHandY = 100 + 68 * Math.sin((minuteAngle - 90) * (Math.PI / 180));

  return (
    <div className='flex flex-col items-center gap-4'>
      <p className='text-sm text-gray-400'>Przeciągnij wskazówki, aby ustawić godzinę:</p>
      <p className='text-2xl font-extrabold text-indigo-700 bg-indigo-50 px-5 py-2 rounded-2xl'>
        {displayHour}:{pad(displayMinutes)}
      </p>
      <svg
        ref={svgRef}
        viewBox='0 0 200 200'
        width='220'
        height='220'
        className='drop-shadow-lg touch-none select-none'
        style={{ cursor: 'crosshair' }}
      >
        <circle cx='100' cy='100' r='95' fill='white' stroke='#6366f1' strokeWidth='4' />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1={100 + 80 * Math.cos(angle)}
              y1={100 + 80 * Math.sin(angle)}
              x2={100 + 90 * Math.cos(angle)}
              y2={100 + 90 * Math.sin(angle)}
              stroke='#4f46e5'
              strokeWidth='3'
              strokeLinecap='round'
            />
          );
        })}
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          return (
            <text
              key={n}
              x={100 + 66 * Math.cos(angle)}
              y={100 + 66 * Math.sin(angle)}
              textAnchor='middle'
              dominantBaseline='central'
              fontSize='14'
              fontWeight='bold'
              fill='#3730a3'
            >
              {n}
            </text>
          );
        })}

        {/* Hour hand */}
        <line
          x1='100'
          y1='100'
          x2={hourHandX}
          y2={hourHandY}
          stroke='#dc2626'
          strokeWidth='7'
          strokeLinecap='round'
          style={{ cursor: 'grab' }}
          onMouseDown={onMouseDown('hour')}
          onTouchStart={onMouseDown('hour')}
        />
        {/* Minute hand */}
        <line
          x1='100'
          y1='100'
          x2={minuteHandX}
          y2={minuteHandY}
          stroke='#16a34a'
          strokeWidth='5'
          strokeLinecap='round'
          style={{ cursor: 'grab' }}
          onMouseDown={onMouseDown('minute')}
          onTouchStart={onMouseDown('minute')}
        />
        {/* Draggable circles at tips */}
        <circle
          cx={hourHandX}
          cy={hourHandY}
          r='10'
          fill='#dc2626'
          fillOpacity='0.25'
          style={{ cursor: 'grab' }}
          onMouseDown={onMouseDown('hour')}
          onTouchStart={onMouseDown('hour')}
        />
        <circle
          cx={minuteHandX}
          cy={minuteHandY}
          r='10'
          fill='#16a34a'
          fillOpacity='0.25'
          style={{ cursor: 'grab' }}
          onMouseDown={onMouseDown('minute')}
          onTouchStart={onMouseDown('minute')}
        />
        <circle cx='100' cy='100' r='5' fill='#6366f1' />
      </svg>

      <div className='flex gap-3 text-sm text-gray-500'>
        <span className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-red-500 inline-block' /> Godziny (krótka)
        </span>
        <span className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-green-600 inline-block' /> Minuty (długa)
        </span>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleCheck}
        className='bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold px-8 py-3 rounded-2xl shadow-lg text-lg'
      >
        Sprawdź! ✅
      </motion.button>
    </div>
  );
}

export default function ClockTrainingGame({ onFinish }) {
  const [tasks] = useState(() => shuffle(TASKS).slice(0, 5));
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [done, setDone] = useState(false);

  const task = tasks[current];

  const handleSubmit = (h, m) => {
    const correct = h === task.hours && m === task.minutes;
    if (correct) setScore((s) => s + 1);
    setFeedback(correct ? 'correct' : 'wrong');
    const nextScore = correct ? score + 1 : score;
    setTimeout(() => {
      setFeedback(null);
      if (current + 1 >= tasks.length) {
        handleDone(nextScore);
      } else {
        setCurrent((c) => c + 1);
      }
    }, 1200);
  };

  const [xpEarned, setXpEarned] = useState(0);

  const handleDone = (finalScore) => {
    const isPerfect = finalScore === tasks.length;
    const isGood = finalScore >= 3;
    const xp = isPerfect
      ? XP_REWARDS.clock_training_perfect
      : isGood
        ? XP_REWARDS.clock_training_good
        : 10;
    const prog = loadProgress();
    addXp(xp, {
      clockPerfect: isPerfect ? prog.clockPerfect + 1 : prog.clockPerfect,
    });
    setXpEarned(xp);
    setDone(true);
  };

  const handleRestart = () => {
    setCurrent(0);
    setScore(0);
    setFeedback(null);
    setDone(false);
    setXpEarned(0);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-col items-center gap-5 py-4'
      >
        <div className='text-6xl'>{score >= 4 ? '🏆' : score >= 2 ? '😊' : '💪'}</div>
        <h3 className='text-2xl font-extrabold text-indigo-700'>
          Wynik: {score}/{tasks.length}
        </h3>
        {xpEarned > 0 && (
          <div className='bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-full text-sm'>
            +{xpEarned} XP ✨
          </div>
        )}
        <p className='text-gray-500 text-center max-w-xs'>
          {score === tasks.length
            ? 'Idealnie! Świetnie znasz zegar!'
            : 'Ćwicz dalej, a będziesz mistrzem zegara!'}
        </p>
        <div className='flex gap-3'>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRestart}
            className='flex items-center gap-2 bg-indigo-100 text-indigo-700 font-bold px-5 py-2.5 rounded-2xl hover:bg-indigo-200 transition'
          >
            <RefreshCw className='w-4 h-4' /> Jeszcze raz
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onFinish}
            className='bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold px-5 py-2.5 rounded-2xl shadow'
          >
            Zakończ lekcję ✅
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full'>
      <div className='flex gap-2 mb-1'>
        {tasks.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${i < current ? 'bg-indigo-400' : i === current ? 'bg-indigo-600 scale-125' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      <div className='bg-amber-50 border border-amber-200 rounded-2xl px-6 py-3 text-center'>
        <p className='text-gray-500 text-sm mb-1'>Ustaw zegar na godzinę:</p>
        <p className='text-3xl font-extrabold text-amber-700'>
          {task.hours}:{pad(task.minutes)}
        </p>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-lg ${
              feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {feedback === 'correct' ? (
              <>
                <CheckCircle className='w-5 h-5' /> Brawo! Dobrze!
              </>
            ) : (
              <>
                <XCircle className='w-5 h-5' /> Niestety, źle. To było {task.hours}:
                {pad(task.minutes)}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!feedback && (
        <DraggableClock
          targetHours={task.hours}
          targetMinutes={task.minutes}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
