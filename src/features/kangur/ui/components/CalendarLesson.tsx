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
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurFeatureHeader,
  KangurGlassPanel,
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

type SectionId = 'intro' | 'dni' | 'miesiace' | 'data' | 'game';

type Slide = { title: string; tts: string; content: React.JSX.Element };

const MONTHS = [
  { name: 'Styczen', days: 31, num: 1 },
  { name: 'Luty', days: 28, num: 2 },
  { name: 'Marzec', days: 31, num: 3 },
  { name: 'Kwiecien', days: 30, num: 4 },
  { name: 'Maj', days: 31, num: 5 },
  { name: 'Czerwiec', days: 30, num: 6 },
  { name: 'Lipiec', days: 31, num: 7 },
  { name: 'Sierpien', days: 31, num: 8 },
  { name: 'Wrzesien', days: 30, num: 9 },
  { name: 'Pazdziernik', days: 31, num: 10 },
  { name: 'Listopad', days: 30, num: 11 },
  { name: 'Grudzien', days: 31, num: 12 },
] as const;

const DAYS = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;

function MiniCalendar({
  month = 2,
  year = 2025,
  highlightDay,
}: {
  month?: number;
  year?: number;
  highlightDay?: number;
}): React.JSX.Element {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const monthData = MONTHS[month - 1] ?? MONTHS[0];
  const startOffset = (firstDay + 6) % 7;
  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= monthData.days; d++) cells.push(d);
  return (
    <KangurLessonCallout accent='slate' className='mx-auto max-w-xs' padding='sm'>
      <p className='text-center font-extrabold text-indigo-700 mb-2'>
        {monthData.name} {year}
      </p>
      <div className='grid grid-cols-7 gap-0.5 text-xs text-center'>
        {DAYS.map((d, i) => (
          <div key={d} className={`font-bold py-1 ${i >= 5 ? 'text-red-500' : 'text-slate-500'}`}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`py-1 rounded-full text-sm font-semibold ${d === highlightDay ? 'bg-indigo-500 text-white' : d !== null && i % 7 >= 5 ? 'text-red-400' : d !== null ? 'text-slate-700' : ''}`}
          >
            {d || ''}
          </div>
        ))}
      </div>
    </KangurLessonCallout>
  );
}

export const SECTION_SLIDES: Record<Exclude<SectionId, 'game'>, Slide[]> = {
  intro: [
    {
      title: 'Czym jest kalendarz?',
      tts: 'Kalendarz to sposob organizowania czasu. Rok ma 12 miesiecy i 365 dni. Tydzien ma 7 dni.',
      content: (
        <div className='flex flex-col items-center gap-4 text-center'>
          <KangurDisplayEmoji data-testid='calendar-lesson-intro-emoji' size='lg'>
            📅
          </KangurDisplayEmoji>
          <p className='max-w-xs leading-relaxed text-slate-600'>
            Kalendarz to sposob organizowania czasu.
            <br />
            <br />
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
              <KangurLessonCallout
                key={d}
                accent='indigo'
                className='flex items-center gap-3'
                padding='sm'
              >
                <span className='text-indigo-500 font-bold w-5'>{i + 1}.</span>
                <span className='font-semibold text-slate-700'>{d}</span>
                <span className='ml-auto text-xs text-indigo-400'>📚 Szkoła</span>
              </KangurLessonCallout>
            ))}
            {['Sobota', 'Niedziela'].map((d, i) => (
              <KangurLessonCallout
                key={d}
                accent='rose'
                className='flex items-center gap-3'
                padding='sm'
              >
                <span className='text-pink-500 font-bold w-5'>{i + 6}.</span>
                <span className='font-semibold text-slate-700'>{d}</span>
                <span className='ml-auto text-xs text-pink-400'>🎉 Weekend</span>
              </KangurLessonCallout>
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
              {
                season: '🌸 Wiosna',
                months: [MONTHS[2], MONTHS[3], MONTHS[4]],
                accent: 'emerald' as const,
              },
              {
                season: '☀️ Lato',
                months: [MONTHS[5], MONTHS[6], MONTHS[7]],
                accent: 'amber' as const,
              },
              {
                season: '🍂 Jesien',
                months: [MONTHS[8], MONTHS[9], MONTHS[10]],
                accent: 'rose' as const,
              },
              {
                season: '❄️ Zima',
                months: [MONTHS[11], MONTHS[0], MONTHS[1]],
                accent: 'sky' as const,
              },
            ].map((g) => (
              <KangurLessonCallout key={g.season} accent={g.accent} padding='sm'>
                <p className='mb-1 text-sm font-bold text-slate-600'>{g.season}</p>
                {g.months.map((m) => (
                  <p key={m.name} className='text-sm text-slate-700'>
                    <span className='font-bold'>{m.num}.</span> {m.name}{' '}
                    <span className='text-slate-400'>({m.days}d)</span>
                  </p>
                ))}
              </KangurLessonCallout>
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
              <KangurLessonCallout
                key={m.name}
                accent={m.days === 31 ? 'indigo' : m.days === 30 ? 'teal' : 'rose'}
                className='rounded-xl text-center text-sm font-semibold'
                padding='sm'
              >
                <div className='font-bold'>{m.name}</div>
                <div className='text-xs'>{m.days} dni</div>
              </KangurLessonCallout>
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
          <KangurLessonCallout accent='indigo' className='max-w-xs text-left space-y-2'>
            <p className='font-semibold text-slate-700'>Jak zapisac date?</p>
            <p className='text-slate-600'>
              📅 <strong>15 marca 2025</strong>
            </p>
            <p className='text-slate-600'>
              📝 Lub: <strong>15/03/2025</strong>
            </p>
            <p className='text-indigo-700 font-bold mt-1'>Dzien / Miesiac / Rok</p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
};

function SectionView({
  sectionId,
  onBack,
  onGameStart,
}: {
  sectionId: Exclude<SectionId, 'game'>;
  onBack: () => void;
  onGameStart: () => void;
}): React.JSX.Element {
  const slides = SECTION_SLIDES[sectionId];
  const [slide, setSlide] = useState(0);
  const isLast = slide === slides.length - 1;
  const activeSlide = slides[slide];

  if (!activeSlide) return <div />;

  const handleNext = (): void => {
    if (isLast) {
      onGameStart();
      return;
    }
    setSlide(slide + 1);
  };

  return (
    <div className='flex flex-col items-center w-full max-w-lg gap-4'>
      <KangurGlassPanel
        className='flex w-full flex-col items-center gap-5'
        data-testid={`calendar-lesson-section-shell-${sectionId}`}
        padding='xl'
        surface='solid'
      >
        {slides.length > 1 && (
          <div className='flex gap-2'>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                type='button'
                aria-label={`Przejdz do slajdu ${i + 1}`}
                aria-current={i === slide ? 'step' : undefined}
                className={cn(
                  KANGUR_STEP_PILL_CLASSNAME,
                  'h-[14px] min-w-[14px] cursor-pointer',
                  i === slide
                    ? 'w-8 scale-[1.04] bg-emerald-500'
                    : i < slide
                      ? 'w-6 bg-emerald-200'
                      : KANGUR_PENDING_STEP_PILL_CLASSNAME
                )}
                data-testid={`calendar-lesson-slide-${sectionId}-${i}`}
              />
            ))}
          </div>
        )}
        <KangurHeadline
          accent='slate'
          as='h2'
          className='text-center'
          data-testid={`calendar-lesson-slide-title-${sectionId}`}
          size='sm'
        >
          {activeSlide.title}
        </KangurHeadline>
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
          <KangurButton
            onClick={slide === 0 ? onBack : () => setSlide(slide - 1)}
            size='lg'
            type='button'
            variant='surface'
          >
            <ArrowLeft className='w-4 h-4' /> {slide === 0 ? 'Menu' : 'Wstecz'}
          </KangurButton>
          <KangurButton
            onClick={handleNext}
            className='flex-1'
            size='lg'
            type='button'
            variant='primary'
          >
            {isLast ? (
              'Gra z kalendarzem 📅'
            ) : (
              <>
                <span>Dalej</span>
                <ArrowRight className='w-4 h-4' />
              </>
            )}
          </KangurButton>
        </div>
      </KangurGlassPanel>
    </div>
  );
}

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '📅', title: 'Czym jest kalendarz?', description: 'Rok, miesiace i dni' },
  { id: 'dni', emoji: '🗓️', title: 'Dni tygodnia', description: 'Od poniedzialku do niedzieli' },
  {
    id: 'miesiace',
    emoji: '🌸',
    title: 'Miesiace i pory roku',
    description: '12 miesiecy — ile dni maja?',
  },
  { id: 'data', emoji: '📝', title: 'Jak czytac date?', description: 'Dzien / miesiac / rok' },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Gra z kalendarzem',
    description: 'Cwicz w interaktywnej grze',
    isGame: true,
  },
];

export default function CalendarLesson(): React.JSX.Element {
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
        <KangurButton
          onClick={() => setActiveSection(null)}
          className='self-start'
          size='sm'
          type='button'
          variant='surface'
        >
          <ArrowLeft className='w-4 h-4' /> Wróc do menu
        </KangurButton>
        <KangurGlassPanel
          className='flex w-full flex-col items-center gap-5'
          data-testid='calendar-lesson-game-shell'
          padding='xl'
          surface='solid'
        >
          <KangurFeatureHeader
            accent='emerald'
            badgeSize='md'
            data-testid='calendar-lesson-game-header'
            headingSize='sm'
            icon='📅'
            title='Gra z kalendarzem'
          />
          <CalendarInteractiveGame onFinish={() => setActiveSection(null)} />
        </KangurGlassPanel>
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
        if (id === 'game') {
          handleGameStart();
        } else {
          setActiveSection(id as SectionId);
        }
      }}
    />
  );
}
