import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import CalendarInteractiveGame from './CalendarInteractiveGame';
import { addXp, buildLessonMasteryUpdate, XP_REWARDS, loadProgress } from '@/features/kangur/ui/services/progress';

type CalendarLessonProps = {
  onBack: () => void;
};

type CalendarMonth = {
  name: string;
  days: number;
  num: number;
};

type LessonSlide = {
  title: string;
  tts: string;
  content: React.JSX.Element;
};

type MiniCalendarProps = {
  month?: number;
  year?: number;
  highlightDay?: number;
};

const MONTHS: CalendarMonth[] = [
  { name: 'Styczeń', days: 31, num: 1 },
  { name: 'Luty', days: 28, num: 2 },
  { name: 'Marzec', days: 31, num: 3 },
  { name: 'Kwiecień', days: 30, num: 4 },
  { name: 'Maj', days: 31, num: 5 },
  { name: 'Czerwiec', days: 30, num: 6 },
  { name: 'Lipiec', days: 31, num: 7 },
  { name: 'Sierpień', days: 31, num: 8 },
  { name: 'Wrzesień', days: 30, num: 9 },
  { name: 'Październik', days: 31, num: 10 },
  { name: 'Listopad', days: 30, num: 11 },
  { name: 'Grudzień', days: 31, num: 12 },
];

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;

function MiniCalendar({ month = 2, year = 2025, highlightDay }: MiniCalendarProps): React.JSX.Element {
  // month is 1-indexed
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const monthData = MONTHS[month - 1] ?? MONTHS[0]!;
  const daysInMonth = monthData.days;
  // Convert Sunday=0 to Monday=0
  const startOffset = (firstDay + 6) % 7;
  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className='bg-white rounded-2xl shadow p-3 w-full max-w-xs mx-auto'>
      <p className='text-center font-extrabold text-indigo-700 mb-2'>
        {monthData.name} {year}
      </p>
      <div className='grid grid-cols-7 gap-0.5 text-xs text-center'>
        {DAYS.map((d, i) => (
          <div key={d} className={`font-bold py-1 ${i >= 5 ? 'text-red-500' : 'text-gray-500'}`}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`py-1 rounded-full text-sm font-semibold transition-all ${
              d === highlightDay
                ? 'bg-indigo-500 text-white'
                : d !== null && i % 7 >= 5
                  ? 'text-red-400'
                  : d !== null
                    ? 'text-gray-700 hover:bg-indigo-50'
                    : ''
            }`}
          >
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthsGrid(): React.JSX.Element {
  const groups = [
    {
      season: '🌸 Wiosna',
      months: [MONTHS[2]!, MONTHS[3]!, MONTHS[4]!],
      color: 'bg-green-50 border-green-200',
    },
    {
      season: '☀️ Lato',
      months: [MONTHS[5]!, MONTHS[6]!, MONTHS[7]!],
      color: 'bg-yellow-50 border-yellow-200',
    },
    {
      season: '🍂 Jesień',
      months: [MONTHS[8]!, MONTHS[9]!, MONTHS[10]!],
      color: 'bg-orange-50 border-orange-200',
    },
    {
      season: '❄️ Zima',
      months: [MONTHS[11]!, MONTHS[0]!, MONTHS[1]!],
      color: 'bg-blue-50 border-blue-200',
    },
  ];
  return (
    <div className='grid grid-cols-2 gap-3 w-full max-w-sm'>
      {groups.map((g) => (
        <div key={g.season} className={`rounded-2xl border p-3 ${g.color}`}>
          <p className='font-bold text-sm text-gray-600 mb-1'>{g.season}</p>
          {g.months.map((m) => (
            <p key={m.name} className='text-sm text-gray-700'>
              <span className='font-bold'>{m.num}.</span> {m.name}{' '}
              <span className='text-gray-400'>({m.days}d)</span>
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

const SLIDES: LessonSlide[] = [
  {
    title: 'Czym jest kalendarz?',
    tts: 'Kalendarz to sposób organizowania czasu. Rok ma 12 miesięcy i 365 dni. Tydzień ma 7 dni.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='text-7xl'>📅</div>
        <p className='text-gray-600 leading-relaxed max-w-xs'>
          Kalendarz to sposób organizowania czasu.
          <br />
          <br />
          📆 Rok ma <strong>12 miesięcy</strong> i <strong>365 dni</strong>.<br />
          🗓️ Tydzień ma <strong>7 dni</strong>.
        </p>
      </div>
    ),
  },
  {
    title: 'Dni tygodnia',
    tts: 'Tydzień ma 7 dni: Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela. Sobota i Niedziela to weekend.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex flex-col gap-2 w-full max-w-xs'>
          {['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'].map((d, i) => (
            <div key={d} className='flex items-center gap-3 bg-indigo-50 rounded-2xl px-4 py-2'>
              <span className='text-indigo-500 font-bold w-5'>{i + 1}.</span>
              <span className='font-semibold text-gray-700'>{d}</span>
              <span className='ml-auto text-xs text-indigo-400'>📚 Szkoła</span>
            </div>
          ))}
          {['Sobota', 'Niedziela'].map((d, i) => (
            <div key={d} className='flex items-center gap-3 bg-pink-50 rounded-2xl px-4 py-2'>
              <span className='text-pink-500 font-bold w-5'>{i + 6}.</span>
              <span className='font-semibold text-gray-700'>{d}</span>
              <span className='ml-auto text-xs text-pink-400'>🎉 Weekend</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: '12 miesięcy roku',
    tts: 'Rok ma 12 miesięcy. Wiosną są Marzec, Kwiecień i Maj. Latem są Czerwiec, Lipiec i Sierpień. Jesienią są Wrzesień, Październik i Listopad. Zimą są Grudzień, Styczeń i Luty.',
    content: (
      <div className='flex flex-col items-center gap-3 text-center'>
        <p className='text-gray-500 text-sm'>Miesiące podzielone na pory roku:</p>
        <MonthsGrid />
      </div>
    ),
  },
  {
    title: 'Ile dni ma miesiąc?',
    tts: 'Większość miesięcy ma 30 lub 31 dni. Styczeń, Marzec, Maj, Lipiec, Sierpień, Październik i Grudzień mają 31 dni. Kwiecień, Czerwiec, Wrzesień i Listopad mają 30 dni. Luty ma tylko 28 dni.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='grid grid-cols-3 gap-2 w-full max-w-sm'>
          {MONTHS.map((m) => (
            <div
              key={m.name}
              className={`rounded-xl px-3 py-2 text-center text-sm font-semibold border ${
                m.days === 31
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : m.days === 30
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-pink-50 border-pink-200 text-pink-700'
              }`}
            >
              <div className='font-bold'>{m.name}</div>
              <div className='text-xs'>{m.days} dni</div>
            </div>
          ))}
        </div>
        <div className='flex gap-3 text-xs flex-wrap justify-center'>
          <span className='bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full'>🔵 31 dni</span>
          <span className='bg-teal-100 text-teal-700 px-2 py-1 rounded-full'>🟢 30 dni</span>
          <span className='bg-pink-100 text-pink-700 px-2 py-1 rounded-full'>🩷 28 dni (Luty)</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Jak czytać datę?',
    tts: 'Datę zapisujemy jako dzień, miesiąc, rok. Na przykład 15 marca 2025. Możemy też napisać 15 ukośnik 03 ukośnik 2025.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <MiniCalendar month={3} year={2025} highlightDay={15} />
        <div className='bg-indigo-50 rounded-2xl p-4 max-w-xs text-left space-y-2'>
          <p className='text-gray-700 font-semibold'>Jak zapisać datę?</p>
          <p className='text-gray-600'>
            📅 <strong>15 marca 2025</strong>
          </p>
          <p className='text-gray-600'>
            📝 Lub: <strong>15/03/2025</strong>
          </p>
          <p className='text-indigo-700 font-bold mt-1'>Dzień / Miesiąc / Rok</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Brawo! Lekcja ukończona! 🎉',
    tts: 'Brawo! Nauczyłeś się o kalendarzu. Pamiętaj: rok ma 12 miesięcy i 365 dni. Tydzień ma 7 dni. Teraz czas na ćwiczenie!',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='text-7xl'>🏆</div>
        <p className='text-gray-600 leading-relaxed max-w-xs'>
          Nauczyłeś/aś się o kalendarzu!
          <br />
          <br />
          📆 Rok = <strong>12 miesięcy</strong>
          <br />
          🗓️ Tydzień = <strong>7 dni</strong>
          <br />
          📅 Data = <strong>dzień/miesiąc/rok</strong>
        </p>
      </div>
    ),
  },
];

export default function CalendarLesson({ onBack }: CalendarLessonProps): React.JSX.Element {
  const [slide, setSlide] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [inTraining, setInTraining] = useState(false);

  const isLast = slide === SLIDES.length - 1;
  const activeSlide = SLIDES[slide];

  const speak = useCallback(() => {
    if (!activeSlide) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = `${activeSlide.title}. ${activeSlide.tts}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [activeSlide]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const goToSlide = (s: number) => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setSlide(s);
  };

  const handleStartTraining = () => {
    const prog = loadProgress();
    addXp(XP_REWARDS.lesson_completed, {
      lessonsCompleted: prog.lessonsCompleted + 1,
      lessonMastery: buildLessonMasteryUpdate(prog, 'calendar', 60),
    });
    setInTraining(true);
  };

  if (inTraining) {
    return (
      <div className='flex flex-col items-center w-full max-w-lg gap-4'>
        <button
          onClick={() => setInTraining(false)}
          className='self-start flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold text-sm transition'
        >
          <ArrowLeft className='w-4 h-4' /> Wróć do lekcji
        </button>
        <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-5'>
          <h2 className='text-xl font-extrabold text-green-700'>📅 Gra z kalendarzem</h2>
          <CalendarInteractiveGame onFinish={onBack} />
        </div>
      </div>
    );
  }

  if (!activeSlide) {
    return <div className='text-sm text-gray-500'>Brak slajdu.</div>;
  }

  return (
    <div className='flex flex-col items-center w-full max-w-lg gap-4'>
      <button
        onClick={onBack}
        className='self-start flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold text-sm transition'
      >
        <ArrowLeft className='w-4 h-4' /> Wróć do lekcji
      </button>

      <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-5'>
        {/* Progress dots */}
        <div className='flex gap-2'>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === slide ? 'bg-green-500 w-6' : 'bg-gray-200 hover:bg-green-200'}`}
            />
          ))}
        </div>

        <div className='flex items-center justify-center gap-3 w-full'>
          <h2 className='text-xl font-extrabold text-green-700 text-center'>
            {activeSlide.title}
          </h2>
          <button
            onClick={speaking ? stopSpeaking : speak}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all shadow ${
              speaking
                ? 'bg-green-500 text-white animate-pulse'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {speaking ? <VolumeX className='w-4 h-4' /> : <Volume2 className='w-4 h-4' />}
            {speaking ? 'Zatrzymaj' : 'Czytaj'}
          </button>
        </div>

        <AnimatePresence mode='wait'>
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className='w-full flex flex-col items-center'
          >
            {activeSlide.content}
          </motion.div>
        </AnimatePresence>

        <div className='flex gap-3 w-full'>
          {slide > 0 && (
            <button
              onClick={() => goToSlide(slide - 1)}
              className='flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-5 py-2.5 rounded-2xl hover:bg-gray-200 transition'
            >
              <ArrowLeft className='w-4 h-4' /> Wstecz
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={isLast ? handleStartTraining : () => goToSlide(slide + 1)}
            className='flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white font-extrabold py-2.5 rounded-2xl shadow'
          >
            {isLast ? (
              'Ćwiczenie z kalendarzem 📅'
            ) : (
              <>
                <span>Dalej</span>
                <ArrowRight className='w-4 h-4' />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
