import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const MONTHS_DATA = [
  { name: 'Styczeń', days: 31, season: '❄️ Zima' },
  { name: 'Luty', days: 28, season: '❄️ Zima' },
  { name: 'Marzec', days: 31, season: '🌸 Wiosna' },
  { name: 'Kwiecień', days: 30, season: '🌸 Wiosna' },
  { name: 'Maj', days: 31, season: '🌸 Wiosna' },
  { name: 'Czerwiec', days: 30, season: '☀️ Lato' },
  { name: 'Lipiec', days: 31, season: '☀️ Lato' },
  { name: 'Sierpień', days: 31, season: '☀️ Lato' },
  { name: 'Wrzesień', days: 30, season: '🍂 Jesień' },
  { name: 'Październik', days: 31, season: '🍂 Jesień' },
  { name: 'Listopad', days: 30, season: '🍂 Jesień' },
  { name: 'Grudzień', days: 31, season: '❄️ Zima' },
];

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

function getCalendarCells(month, year) {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7; // Mon=0
  const days = MONTHS_DATA[month].days;
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

function getDayOfWeek(year, month, day) {
  const d = new Date(year, month, day).getDay();
  return (d + 6) % 7; // Mon=0..Sun=6
}

// --- Task types ---
// 1. "Click the Nth weekday name" - flip through weekday cards
// 2. "Click on the day that is a [weekday]" - tap calendar cells
// 3. "Drag the month card to its season" - drag month chips to season buckets
// 4. "Flip to the correct month" - swipe/navigate to a specific month number
// 5. "Click all Saturdays/Sundays"

function generateTask(month, year) {
  const type = Math.floor(Math.random() * 5);
  const cells = getCalendarCells(month, year);
  const validDays = cells.filter(Boolean);

  if (type === 0) {
    // Click the name of a specific weekday
    const targetIdx = Math.floor(Math.random() * 7);
    return {
      type: 'click_weekday_name',
      targetIdx,
      label: `Kliknij dzień tygodnia: "${DAY_LABELS[targetIdx]}"`,
    };
  }

  if (type === 1) {
    // Click a specific date that falls on a given weekday
    const dayIdx = Math.floor(Math.random() * 7);
    const matches = validDays.filter((d) => getDayOfWeek(year, month, d) === dayIdx);
    if (matches.length === 0) return generateTask(month, year);
    const target = matches[Math.floor(Math.random() * matches.length)];
    return {
      type: 'click_date',
      targetDay: target,
      weekdayName: DAY_LABELS[dayIdx],
      month,
      year,
      label: `Kliknij datę w kalendarzu, która wypada w ${['poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę', 'niedzielę'][dayIdx]}`,
    };
  }

  if (type === 2) {
    // Drag month card to correct season
    const mIdx = Math.floor(Math.random() * 12);
    const m = MONTHS_DATA[mIdx];
    return {
      type: 'drag_season',
      monthName: m.name,
      correctSeason: m.season,
      label: `Przeciągnij miesiąc "${m.name}" do właściwej pory roku`,
    };
  }

  if (type === 3) {
    // Navigate to the correct month
    const target = Math.floor(Math.random() * 12);
    return {
      type: 'flip_month',
      targetMonth: target,
      label: `Przejdź do miesiąca o numerze ${target + 1} (${MONTHS_DATA[target].name})`,
    };
  }

  // type 4: Click all Saturdays
  const isSat = Math.random() > 0.5;
  const dayIdx = isSat ? 5 : 6;
  const dayName = isSat ? 'soboty' : 'niedziele';
  const targets = validDays.filter((d) => getDayOfWeek(year, month, d) === dayIdx);
  return {
    type: 'click_all_weekends',
    targets,
    dayIdx,
    label: `Kliknij wszystkie ${dayName} w tym miesiącu`,
  };
}

const SEASONS = ['🌸 Wiosna', '☀️ Lato', '🍂 Jesień', '❄️ Zima'];

export default function CalendarInteractiveGame({ onFinish }) {
  const YEAR = 2025;
  const [month, setMonth] = useState(0);
  const [task, setTask] = useState(() => generateTask(0, YEAR));
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  // For drag_season
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(false);

  // For click_all_weekends
  const [clicked, setClicked] = useState([]);

  const TOTAL = 6;

  const nextRound = (correct) => {
    const ns = correct ? score + 1 : score;
    setScore(ns);
    setFeedback(correct ? 'correct' : 'wrong');
    setClicked([]);
    setTimeout(() => {
      setFeedback(null);
      if (round + 1 >= TOTAL) {
        setDone(true);
        return;
      }
      const nm = Math.floor(Math.random() * 12);
      setMonth(nm);
      setTask(generateTask(nm, YEAR));
      setRound((r) => r + 1);
    }, 1300);
  };

  const cells = getCalendarCells(month, YEAR);
  const validDays = cells.filter(Boolean);

  // --- Handlers per type ---
  const handleWeekdayNameClick = (idx) => {
    if (feedback) return;
    nextRound(idx === task.targetIdx);
  };

  const handleDateClick = (day) => {
    if (feedback || day === null) return;
    if (task.type === 'click_date') {
      nextRound(day === task.targetDay);
    } else if (task.type === 'click_all_weekends') {
      if (clicked.includes(day)) return;
      const newClicked = [...clicked, day];
      setClicked(newClicked);
      if (
        newClicked.length === task.targets.length &&
        task.targets.every((t) => newClicked.includes(t))
      ) {
        nextRound(true);
      } else if (newClicked.length >= task.targets.length) {
        nextRound(false);
      }
    }
  };

  const handleFlipMonth = (dir) => {
    if (feedback) return;
    const nm = (month + dir + 12) % 12;
    setMonth(nm);
    if (task.type === 'flip_month' && nm === task.targetMonth) {
      nextRound(true);
    }
  };

  // Drag season
  const handleDrop = (season) => {
    setDragOver(null);
    setDragging(false);
    if (feedback) return;
    nextRound(season === task.correctSeason);
  };

  const restart = () => {
    setRound(0);
    setScore(0);
    setDone(false);
    setFeedback(null);
    setClicked([]);
    setDragging(false);
    setDragOver(null);
    const nm = 0;
    setMonth(nm);
    setTask(generateTask(nm, YEAR));
  };

  if (done) {
    const pct = Math.round((score / TOTAL) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='flex flex-col items-center gap-4 bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm'
      >
        <div className='text-6xl'>{pct === 100 ? '🏆' : pct >= 60 ? '🌟' : '💪'}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>
          Wynik: {score}/{TOTAL}
        </h2>
        <div className='w-full bg-gray-100 rounded-full h-3 overflow-hidden'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8 }}
            className='h-full bg-gradient-to-r from-green-400 to-teal-400 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {pct === 100
            ? 'Idealnie! Znasz kalendarz na wylot!'
            : pct >= 60
              ? 'Świetnie! Ćwicz dalej!'
              : 'Nie poddawaj się!'}
        </p>
        <div className='flex gap-3 w-full'>
          <button
            onClick={restart}
            className='flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
          >
            <RefreshCw className='w-4 h-4' /> Jeszcze raz
          </button>
          <button
            onClick={onFinish}
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-green-400 to-teal-400 text-white font-bold shadow hover:opacity-90 transition'
          >
            Wróć
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-3 w-full max-w-sm'>
      {/* Progress */}
      <div className='flex items-center gap-2 w-full'>
        <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
          <div
            style={{ width: `${(round / TOTAL) * 100}%` }}
            className='h-full bg-gradient-to-r from-green-400 to-teal-400 rounded-full transition-all duration-500'
          />
        </div>
        <span className='text-xs font-bold text-gray-400'>
          {round + 1}/{TOTAL}
        </span>
      </div>

      {/* Task label */}
      <motion.div
        key={round}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-green-50 border border-green-200 rounded-2xl px-4 py-3 w-full text-center'
      >
        <p className='text-sm font-bold text-green-800'>📅 {task.label}</p>
      </motion.div>

      {/* Feedback overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ opacity: 0 }}
            className={`text-xl font-extrabold px-5 py-2 rounded-2xl ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
          >
            {feedback === 'correct' ? '🎉 Brawo!' : '❌ Nie tym razem!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar (always shown for date/weekend tasks and flip) */}
      {(task.type === 'click_date' ||
        task.type === 'click_all_weekends' ||
        task.type === 'flip_month') && (
        <div className='bg-white rounded-2xl shadow p-3 w-full'>
          {/* Month navigation */}
          <div className='flex items-center justify-between mb-2'>
            <button
              onClick={() => handleFlipMonth(-1)}
              className='p-1.5 rounded-full hover:bg-gray-100 transition'
            >
              <ChevronLeft className='w-4 h-4 text-gray-500' />
            </button>
            <p className='font-extrabold text-green-700 text-sm'>
              {MONTHS_DATA[month].name} {YEAR}
            </p>
            <button
              onClick={() => handleFlipMonth(1)}
              className='p-1.5 rounded-full hover:bg-gray-100 transition'
            >
              <ChevronRight className='w-4 h-4 text-gray-500' />
            </button>
          </div>
          {/* Day headers */}
          <div className='grid grid-cols-7 gap-0.5 text-center mb-1'>
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className={`text-xs font-bold py-0.5 ${i >= 5 ? 'text-red-400' : 'text-gray-400'}`}
              >
                {d}
              </div>
            ))}
          </div>
          {/* Cells */}
          <div className='grid grid-cols-7 gap-0.5 text-center'>
            {cells.map((d, i) => {
              const isWeekend = i % 7 >= 5;
              const isTarget =
                task.type === 'click_date' && d === task.targetDay && feedback === 'correct';
              const isClicked = task.type === 'click_all_weekends' && clicked.includes(d);
              const isCorrectWeekend =
                task.type === 'click_all_weekends' && task.targets?.includes(d) && feedback;
              return (
                <button
                  key={i}
                  onClick={() => d && handleDateClick(d)}
                  disabled={!d || !!feedback}
                  className={`py-1.5 rounded-full text-xs font-semibold transition-all select-none
                    ${!d ? 'cursor-default' : 'cursor-pointer hover:bg-green-100'}
                    ${isTarget ? 'bg-green-400 text-white' : ''}
                    ${isClicked ? 'bg-teal-400 text-white scale-110' : ''}
                    ${isCorrectWeekend && !isClicked ? 'bg-green-200' : ''}
                    ${d && isWeekend && !isClicked && !isTarget ? 'text-red-400' : d && !isClicked && !isTarget ? 'text-gray-700' : ''}
                  `}
                >
                  {d || ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekday name buttons */}
      {task.type === 'click_weekday_name' && (
        <div className='grid grid-cols-4 gap-2 w-full'>
          {DAY_LABELS.map((d, i) => (
            <motion.button
              key={d}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleWeekdayNameClick(i)}
              disabled={!!feedback}
              className={`py-3 rounded-2xl font-bold text-sm border-2 transition-all
                ${
                  feedback && i === task.targetIdx
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : i >= 5
                      ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-green-400'
                }
              `}
            >
              {d}
            </motion.button>
          ))}
        </div>
      )}

      {/* Drag season task */}
      {task.type === 'drag_season' && (
        <div className='flex flex-col items-center gap-3 w-full'>
          {/* Month chip to drag */}
          <div
            draggable
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
            className='bg-green-400 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg cursor-grab active:cursor-grabbing select-none text-lg'
          >
            📅 {task.monthName}
          </div>
          <p className='text-xs text-gray-400'>Przeciągnij powyżej na właściwą porę roku ⬇️</p>
          {/* Season drop zones */}
          <div className='grid grid-cols-2 gap-2 w-full'>
            {SEASONS.map((season) => (
              <div
                key={season}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(season);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(season)}
                className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all text-center
                  ${
                    dragOver === season
                      ? 'border-green-400 bg-green-50 scale-105'
                      : feedback && season === task.correctSeason
                        ? 'border-green-400 bg-green-50'
                        : 'border-dashed border-gray-300 bg-white'
                  }
                `}
              >
                <span className='text-2xl'>{season.split(' ')[0]}</span>
                <span className='text-xs font-bold text-gray-600'>
                  {season.split(' ').slice(1).join(' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
