import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import CalendarInteractiveGame from './CalendarInteractiveGame';
import {
  addXp,
  buildLessonMasteryUpdate,
  XP_REWARDS,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import LessonHub from '@/features/kangur/ui/components/LessonHub';

type CalendarLessonProps = { onBack: () => void };
type SectionId = 'intro' | 'dni' | 'miesiace' | 'data' | 'game';

type Slide = { title: string; tts: string; content: React.JSX.Element };

const MONTHS = [
  { name: 'Styczen', days: 31, num: 1 }, { name: 'Luty', days: 28, num: 2 },
  { name: 'Marzec', days: 31, num: 3 }, { name: 'Kwiecien', days: 30, num: 4 },
  { name: 'Maj', days: 31, num: 5 }, { name: 'Czerwiec', days: 30, num: 6 },
  { name: 'Lipiec', days: 31, num: 7 }, { name: 'Sierpien', days: 31, num: 8 },
  { name: 'Wrzesien', days: 30, num: 9 }, { name: 'Pazdziernik', days: 31, num: 10 },
  { name: 'Listopad', days: 30, num: 11 }, { name: 'Grudzien', days: 31, num: 12 },
] as const;

const DAYS = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;

function MiniCalendar({ month = 2, year = 2025, highlightDay }: { month?: number; year?: number; highlightDay?: number }): React.JSX.Element {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const monthData = MONTHS[month - 1] ?? MONTHS[0];
  const startOffset = (firstDay + 6) % 7;
  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= monthData.days; d++) cells.push(d);
  return (
    <div className='bg-white rounded-2xl shadow p-3 w-full max-w-xs mx-auto'>
      <p className='text-center font-extrabold text-indigo-700 mb-2'>{monthData.name} {year}</p>
      <div className='grid grid-cols-7 gap-0.5 text-xs text-center'>
        {DAYS.map((d, i) => (
          <div key={d} className={`font-bold py-1 ${i >= 5 ? 'text-red-500' : 'text-gray-500'}`}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className={`py-1 rounded-full text-sm font-semibold ${d === highlightDay ? 'bg-indigo-500 text-white' : d !== null && i % 7 >= 5 ? 'text-red-400' : d !== null ? 'text-gray-700' : ''}`}>
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTION_SLIDES: Record<Exclude<SectionId, 'game'>, Slide[]> = {
  intro: [
    {
      title: 'Czym jest kalendarz?',
      tts: 'Kalendarz to sposob organizowania czasu. Rok ma 12 miesiecy i 365 dni. Tydzien ma 7 dni.',
      content: (
        <div className='flex flex-col items-center gap-4 text-center'>
          <div className='text-7xl'>📅</div>
          <p className='text-gray-600 leading-relaxed max-w-xs'>
            Kalendarz to sposob organizowania czasu.<br /><br />
            📆 Rok ma <strong>12 miesiecy</strong> i <strong>365 dni</strong>.<br />
            🗓️ Tydzien ma <strong>7 dni</strong>.
          </p>
        </div>
      ),
    },
  ],
  dni: [
    {
      title: 'Dni tygodnia',
      tts: 'Tydzien ma 7 dni: Poniedzialek, Wtorek, Sroda, Czwartek, Piatek, Sobota, Niedziela.',
      content: (
        <div className='flex flex-col items-center gap-4 text-center'>
          <div className='flex flex-col gap-2 w-full max-w-xs'>
            {['Poniedzialek', 'Wtorek', 'Sroda', 'Czwartek', 'Piatek'].map((d, i) => (
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
  ],
  miesiace: [
    {
      title: '12 miesiecy roku',
      tts: 'Rok ma 12 miesiecy podzielonych na cztery pory roku.',
      content: (
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='grid grid-cols-2 gap-3 w-full max-w-sm'>
            {[
              { season: '🌸 Wiosna', months: [MONTHS[2], MONTHS[3], MONTHS[4]], color: 'bg-green-50 border-green-200' },
              { season: '☀️ Lato', months: [MONTHS[5], MONTHS[6], MONTHS[7]], color: 'bg-yellow-50 border-yellow-200' },
              { season: '🍂 Jesien', months: [MONTHS[8], MONTHS[9], MONTHS[10]], color: 'bg-orange-50 border-orange-200' },
              { season: '❄️ Zima', months: [MONTHS[11], MONTHS[0], MONTHS[1]], color: 'bg-blue-50 border-blue-200' },
            ].map((g) => (
              <div key={g.season} className={`rounded-2xl border p-3 ${g.color}`}>
                <p className='font-bold text-sm text-gray-600 mb-1'>{g.season}</p>
                {g.months.map((m) => (
                  <p key={m.name} className='text-sm text-gray-700'>
                    <span className='font-bold'>{m.num}.</span> {m.name} <span className='text-gray-400'>({m.days}d)</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Ile dni ma miesiac?',
      tts: 'Wiekszosc miesiecy ma 30 lub 31 dni. Luty ma tylko 28 dni.',
      content: (
        <div className='flex flex-col items-center gap-4 text-center'>
          <div className='grid grid-cols-3 gap-2 w-full max-w-sm'>
            {MONTHS.map((m) => (
              <div key={m.name} className={`rounded-xl px-3 py-2 text-center text-sm font-semibold border ${m.days === 31 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : m.days === 30 ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-pink-50 border-pink-200 text-pink-700'}`}>
                <div className='font-bold'>{m.name}</div>
                <div className='text-xs'>{m.days} dni</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ],
  data: [
    {
      title: 'Jak czytac date?',
      tts: 'Date zapisujemy jako dzien, miesiac, rok. Na przykład 15 marca 2025.',
      content: (
        <div className='flex flex-col items-center gap-4 text-center'>
          <MiniCalendar month={3} year={2025} highlightDay={15} />
          <div className='bg-indigo-50 rounded-2xl p-4 max-w-xs text-left space-y-2'>
            <p className='text-gray-700 font-semibold'>Jak zapisac date?</p>
            <p className='text-gray-600'>📅 <strong>15 marca 2025</strong></p>
            <p className='text-gray-600'>📝 Lub: <strong>15/03/2025</strong></p>
            <p className='text-indigo-700 font-bold mt-1'>Dzien / Miesiac / Rok</p>
          </div>
        </div>
      ),
    },
  ],
};

function SectionView({ sectionId, onBack, onGameStart }: { sectionId: Exclude<SectionId, 'game'>; onBack: () => void; onGameStart: () => void }): React.JSX.Element {
  const slides = SECTION_SLIDES[sectionId];
  const [slide, setSlide] = useState(0);
  const isLast = slide === slides.length - 1;
  const activeSlide = slides[slide];

  if (!activeSlide) return <div />;

  const handleNext = (): void => {
    if (isLast) { onGameStart(); return; }
    setSlide(slide + 1);
  };

  return (
    <div className='flex flex-col items-center w-full max-w-lg gap-4'>
      <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-5'>
        {slides.length > 1 && (
          <div className='flex gap-2'>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} className={`h-2.5 rounded-full transition-all ${i === slide ? 'w-6 bg-green-500' : 'w-2.5 bg-gray-200 hover:bg-green-200'}`} />
            ))}
          </div>
        )}
        <h2 className='text-xl font-extrabold text-green-700 text-center'>{activeSlide.title}</h2>
        <AnimatePresence mode='wait'>
          <motion.div key={slide} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className='w-full flex flex-col items-center'>
            {activeSlide.content}
          </motion.div>
        </AnimatePresence>
        <div className='flex gap-3 w-full'>
          <button onClick={slide === 0 ? onBack : () => setSlide(slide - 1)} className='flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-5 py-2.5 rounded-2xl hover:bg-gray-200 transition'>
            <ArrowLeft className='w-4 h-4' /> {slide === 0 ? 'Menu' : 'Wstecz'}
          </button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleNext} className='flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white font-extrabold py-2.5 rounded-2xl shadow'>
            {isLast ? 'Gra z kalendarzem 📅' : <><span>Dalej</span><ArrowRight className='w-4 h-4' /></>}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

const HUB_SECTIONS = [
  { id: 'intro', emoji: '📅', title: 'Czym jest kalendarz?', description: 'Rok, miesiace i dni' },
  { id: 'dni', emoji: '🗓️', title: 'Dni tygodnia', description: 'Od poniedzialku do niedzieli' },
  { id: 'miesiace', emoji: '🌸', title: 'Miesiace i pory roku', description: '12 miesiecy — ile dni maja?' },
  { id: 'data', emoji: '📝', title: 'Jak czytac date?', description: 'Dzien / miesiac / rok' },
  { id: 'game', emoji: '🎮', title: 'Gra z kalendarzem', description: 'Cwicz w interaktywnej grze', isGame: true },
];

export default function CalendarLesson({ onBack }: CalendarLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const handleGameStart = (): void => {
    const prog = loadProgress();
    addXp(XP_REWARDS.lesson_completed, {
      lessonsCompleted: prog.lessonsCompleted + 1,
      lessonMastery: buildLessonMasteryUpdate(prog, 'calendar', 60),
    });
    setActiveSection('game');
  };

  if (activeSection === 'game') {
    return (
      <div className='flex flex-col items-center w-full max-w-lg gap-4'>
        <button
          onClick={() => setActiveSection(null)}
          className='self-start flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold text-sm transition'
        >
          <ArrowLeft className='w-4 h-4' /> Wróc do menu
        </button>
        <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-5'>
          <h2 className='text-xl font-extrabold text-green-700'>📅 Gra z kalendarzem</h2>
          <CalendarInteractiveGame onFinish={() => setActiveSection(null)} />
        </div>
      </div>
    );
  }

  if (activeSection && (activeSection as SectionId) !== 'game') {
    return (
      <SectionView
        sectionId={activeSection}
        onBack={() => setActiveSection(null)}
        onGameStart={handleGameStart}
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='📅'
      lessonTitle='Nauka kalendarza'
      gradientClass='from-green-400 to-teal-500'
      sections={HUB_SECTIONS}
      onSelect={(id) => {
        if (id === 'game') { handleGameStart(); } else { setActiveSection(id as SectionId); }
      }}
      onBack={onBack}
    />
  );
}
