import { ArrowLeft } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide as LessonSlideSectionSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurButton,
  KangurFeatureHeader,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  buildLessonMasteryUpdate,
  XP_REWARDS,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

import ClockTrainingGame, { type ClockTrainingSectionId } from './ClockTrainingGame';

type AnalogClockProps = {
  hours: number;
  minutes: number;
  label?: string;
  highlightHour?: boolean;
  highlightMinute?: boolean;
  showHourHand?: boolean;
  showMinuteHand?: boolean;
};

type SectionId = 'hours' | 'minutes' | 'combined';
type TrainingCardId = 'game_hours' | 'game_minutes' | 'game_combined';
type ClockHubId = SectionId | TrainingCardId;

type LessonSlide = LessonSlideSectionSlide & {
  tts: string;
};

type LessonSection = {
  id: SectionId;
  title: string;
  subtitle: string;
  slides: LessonSlide[];
};

type ClockHubSection = {
  id: ClockHubId;
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};

type ClockLessonView =
  | { kind: 'hub' }
  | { kind: 'lesson'; sectionId: SectionId }
  | { kind: 'training'; sectionId: ClockTrainingSectionId };

function AnalogClock({
  hours,
  minutes,
  label,
  highlightHour = false,
  highlightMinute = false,
  showHourHand = true,
  showMinuteHand = true,
}: AnalogClockProps): React.JSX.Element {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <div className='flex flex-col items-center gap-2'>
      <svg viewBox='0 0 200 200' width='180' height='180' className='drop-shadow-lg'>
        <circle cx='100' cy='100' r='95' fill='white' stroke='#6366f1' strokeWidth='4' />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 100 + 80 * Math.cos(angle);
          const y1 = 100 + 80 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke='#4f46e5'
              strokeWidth='3'
              strokeLinecap='round'
            />
          );
        })}
        {Array.from({ length: 60 }, (_, i) => {
          if (i % 5 === 0) return null;
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const x1 = 100 + 85 * Math.cos(angle);
          const y1 = 100 + 85 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke='#a5b4fc' strokeWidth='1' />;
        })}
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 100 + 66 * Math.cos(angle);
          const y = 100 + 66 * Math.sin(angle);
          return (
            <text
              key={n}
              x={x}
              y={y}
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
        {showHourHand ? (
          <line
            data-testid='clock-lesson-hour-hand'
            x1='100'
            y1='100'
            x2={100 + 48 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
            y2={100 + 48 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
            stroke={highlightHour ? '#dc2626' : '#1e1b4b'}
            strokeWidth={highlightHour ? 8 : 6}
            strokeLinecap='round'
          />
        ) : null}
        {showMinuteHand ? (
          <line
            data-testid='clock-lesson-minute-hand'
            x1='100'
            y1='100'
            x2={100 + 68 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
            y2={100 + 68 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
            stroke={highlightMinute ? '#16a34a' : '#4f46e5'}
            strokeWidth={highlightMinute ? 6 : 4}
            strokeLinecap='round'
          />
        ) : null}
        <circle cx='100' cy='100' r='5' fill='#6366f1' />
      </svg>
      {label ? <p className='text-center text-sm font-semibold text-slate-500'>{label}</p> : null}
    </div>
  );
}

const HOURS_SLIDES: LessonSlide[] = [
  {
    title: 'Co pokazuje krótka wskazówka?',
    tts: 'Krótka wskazówka pokazuje godzinę. Na tej sekcji patrzymy tylko na nią.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock
            hours={3}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='Krótka wskazówka na 3'
          />
          <AnalogClock
            hours={8}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='Krótka wskazówka na 8'
          />
        </div>
        <p className='max-w-xs leading-relaxed text-slate-600'>
          Patrzymy na <strong className='text-red-600'>krótką wskazówkę</strong>. Ona mówi nam,
          która jest godzina.
        </p>
      </div>
    ),
  },
  {
    title: 'Pełne godziny (:00)',
    tts: 'Gdy jest pełna godzina, odczytujemy tylko godzinę z krótkiej wskazówki.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock
            hours={1}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='1:00'
          />
          <AnalogClock
            hours={6}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='6:00'
          />
          <AnalogClock
            hours={11}
            minutes={0}
            highlightHour
            showMinuteHand={false}
            label='11:00'
          />
        </div>
        <p className='max-w-xs leading-relaxed text-slate-600'>
          W tej sekcji trenujemy tylko odczyt godziny: 1, 6, 11.
        </p>
      </div>
    ),
  },
  {
    title: 'Szybki test godzin',
    tts: 'Spójrz na krótką wskazówkę i nazwij godzinę. Minuty pomijamy.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <AnalogClock
          hours={9}
          minutes={0}
          highlightHour
          showMinuteHand={false}
          label='Jaka to godzina?'
        />
        <KangurLessonCallout accent='rose' className='max-w-xs text-left'>
          <p className='font-semibold text-slate-700'>Krok:</p>
          <p className='mt-1 text-sm text-slate-600'>
            1. Znajdź krótką wskazówkę.
            <br />
            2. Odczytaj numer, na który pokazuje.
          </p>
          <p className='text-red-700 font-extrabold mt-2'>Wynik: 9:00</p>
        </KangurLessonCallout>
      </div>
    ),
  },
];

const MINUTES_SLIDES: LessonSlide[] = [
  {
    title: 'Co pokazuje długa wskazówka?',
    tts: 'Długa wskazówka pokazuje minuty. W tej sekcji skupiamy się tylko na minutach.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <AnalogClock
          hours={12}
          minutes={20}
          highlightMinute
          showHourHand={false}
          label='Długa wskazówka = minuty'
        />
        <p className='max-w-xs leading-relaxed text-slate-600'>
          <strong className='text-green-600'>Długa wskazówka</strong> chodzi po tarczy i mówi,
          ile minut minęło.
        </p>
      </div>
    ),
  },
  {
    title: 'Mapa minut co 5',
    tts: 'Każdy numer to kolejne pięć minut: 1 to 5, 2 to 10, 3 to 15 i tak dalej.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock
            hours={12}
            minutes={15}
            highlightMinute
            showHourHand={false}
            label='3 = 15 min'
          />
          <AnalogClock
            hours={12}
            minutes={30}
            highlightMinute
            showHourHand={false}
            label='6 = 30 min'
          />
          <AnalogClock
            hours={12}
            minutes={45}
            highlightMinute
            showHourHand={false}
            label='9 = 45 min'
          />
        </div>
        <p className='max-w-xs leading-relaxed text-slate-600'>
          Zapamiętaj: każda kolejna liczba to +5 minut.
        </p>
      </div>
    ),
  },
  {
    title: 'Szybki test minut',
    tts: 'Patrz tylko na długą wskazówkę i nazwij minuty.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <AnalogClock
          hours={12}
          minutes={35}
          highlightMinute
          showHourHand={false}
          label='Jaka to liczba minut?'
        />
        <KangurLessonCallout accent='emerald' className='max-w-xs text-left'>
          <p className='font-semibold text-slate-700'>Krok:</p>
          <p className='mt-1 text-sm text-slate-600'>
            Długa wskazówka stoi przy 7.
            <br />
            7 × 5 = 35 minut.
          </p>
          <p className='text-green-700 font-extrabold mt-2'>Wynik: :35</p>
        </KangurLessonCallout>
      </div>
    ),
  },
];

const COMBINED_SLIDES: LessonSlide[] = [
  {
    title: 'Jak łączyć obie wskazówki?',
    tts: 'Najpierw czytamy godzinę z krótkiej wskazówki, potem minuty z długiej.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <AnalogClock hours={8} minutes={30} label='Przykład: 8:30' />
        <KangurLessonCallout accent='indigo' className='max-w-xs text-left space-y-2'>
          <p className='font-semibold text-slate-700'>Kroki:</p>
          <p className='text-sm text-slate-600'>1. Krótka wskazówka: godzina = 8</p>
          <p className='text-sm text-slate-600'>2. Długa wskazówka: minuty = 30</p>
          <p className='text-indigo-700 font-extrabold'>Wynik: 8:30</p>
        </KangurLessonCallout>
      </div>
    ),
  },
  {
    title: 'Kwadrans po i kwadrans do',
    tts: 'Długa wskazówka na 3 to kwadrans po, a na 9 to kwadrans do następnej godziny.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock hours={5} minutes={15} label='5:15 - kwadrans po 5' />
          <AnalogClock hours={5} minutes={45} label='5:45 - kwadrans do 6' />
        </div>
        <p className='max-w-xs leading-relaxed text-slate-600'>
          Odczytujemy godzinę i minuty jednocześnie.
        </p>
      </div>
    ),
  },
  {
    title: 'Gotowy/a na ćwiczenie',
    tts: 'Teraz potrafisz czytać godziny i minuty razem. Przejdź do ćwiczenia.',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='text-7xl'>🏆</div>
        <p className='max-w-xs leading-relaxed text-slate-600'>
          Brawo! Umiesz:
          <br />
          🔴 czytać godziny,
          <br />
          🟢 czytać minuty,
          <br />
          ✅ łączyć obie wskazówki w pełny czas.
        </p>
      </div>
    ),
  },
];

export const LESSON_SECTIONS: LessonSection[] = [
  {
    id: 'hours',
    title: 'Sekcja 1: Godziny (krótka wskazówka)',
    subtitle: 'Uczymy się tylko krótkiej wskazówki i pełnych godzin (:00).',
    slides: HOURS_SLIDES,
  },
  {
    id: 'minutes',
    title: 'Sekcja 2: Minuty (długa wskazówka)',
    subtitle: 'Uczymy się tylko długiej wskazówki i mapy minut.',
    slides: MINUTES_SLIDES,
  },
  {
    id: 'combined',
    title: 'Sekcja 3: Godziny i Minuty razem',
    subtitle: 'Łączymy obie wskazówki i odczytujemy pełny czas.',
    slides: COMBINED_SLIDES,
  },
];

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  hours: HOURS_SLIDES,
  minutes: MINUTES_SLIDES,
  combined: COMBINED_SLIDES,
};

export const HUB_SECTIONS: ClockHubSection[] = [
  {
    id: 'hours',
    emoji: '🔴',
    title: 'Godziny',
    description: 'Krótka wskazówka i pełne godziny',
  },
  {
    id: 'minutes',
    emoji: '🟢',
    title: 'Minuty',
    description: 'Długa wskazówka i liczenie co 5',
  },
  {
    id: 'combined',
    emoji: '🕐',
    title: 'Łączenie wskazówek',
    description: 'Czytaj pełny czas na zegarze',
  },
  {
    id: 'game_hours',
    emoji: '🎯',
    title: 'Ćwiczenie: Godziny',
    description: 'Trenuj pełne godziny i krótką wskazówkę',
    isGame: true,
  },
  {
    id: 'game_minutes',
    emoji: '🟢',
    title: 'Ćwiczenie: Minuty',
    description: 'Ćwicz długą wskazówkę i minuty co 5',
    isGame: true,
  },
  {
    id: 'game_combined',
    emoji: '🕐',
    title: 'Ćwiczenie: Pełny czas',
    description: 'Łącz godziny i minuty w pełny odczyt czasu',
    isGame: true,
  },
];

export default function ClockLesson(): React.JSX.Element {
  const [view, setView] = useState<ClockLessonView>({ kind: 'hub' });
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);
  const lessonCompletionAwardedRef = useRef(false);
  const lessonHubSections = HUB_SECTIONS.map((section) =>
    section.isGame
      ? section
      : {
        ...section,
        progress: sectionProgress[section.id as SectionId],
      }
  );

  const handleStartTraining = useCallback((sectionId: ClockTrainingSectionId) => {
    if (!lessonCompletionAwardedRef.current) {
      const progress = loadProgress();
      addXp(XP_REWARDS.lesson_completed, {
        lessonsCompleted: progress.lessonsCompleted + 1,
        lessonMastery: buildLessonMasteryUpdate(progress, 'clock', 60),
      });
      lessonCompletionAwardedRef.current = true;
    }
    setView({ kind: 'training', sectionId });
  }, []);

  if (view.kind === 'training') {
    const trainingTitle =
      view.sectionId === 'hours'
        ? 'Ćwiczenie: Godziny'
        : view.sectionId === 'minutes'
          ? 'Ćwiczenie: Minuty'
          : 'Ćwiczenie: Pełny czas';

    return (
      <div className='flex flex-col items-center w-full max-w-lg gap-4'>
        <KangurButton
          onClick={() => setView({ kind: 'hub' })}
          className='self-start'
          size='sm'
          type='button'
          variant='surface'
        >
          <ArrowLeft className='w-4 h-4' /> Wróć do tematów
        </KangurButton>
        <KangurGlassPanel
          className='flex w-full flex-col items-center gap-5'
          data-testid='clock-lesson-training-shell'
          padding='xl'
          surface='solid'
        >
          <KangurFeatureHeader
            accent='indigo'
            badgeSize='md'
            data-testid='clock-lesson-training-header'
            headingSize='sm'
            icon='🕐'
            title={trainingTitle}
          />
          <ClockTrainingGame
            key={view.sectionId}
            onFinish={() => setView({ kind: 'hub' })}
            section={view.sectionId}
          />
        </KangurGlassPanel>
      </div>
    );
  }

  if (view.kind === 'lesson') {
    return (
      <LessonSlideSection
        slides={SLIDES[view.sectionId]}
        onBack={() => setView({ kind: 'hub' })}
        onProgressChange={(viewedCount) => markSectionViewedCount(view.sectionId, viewedCount)}
        dotActiveClass='bg-indigo-500'
        dotDoneClass='bg-indigo-200'
        gradientClass='from-indigo-400 to-purple-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🕐'
      lessonTitle='Nauka zegara'
      gradientClass='from-indigo-400 to-purple-500'
      progressDotClassName='bg-indigo-200'
      sections={lessonHubSections}
      onSelect={(sectionId) => {
        if (sectionId === 'game_hours') {
          handleStartTraining('hours');
          return;
        }
        if (sectionId === 'game_minutes') {
          handleStartTraining('minutes');
          return;
        }
        if (sectionId === 'game_combined') {
          handleStartTraining('combined');
          return;
        }
        markSectionOpened(sectionId as SectionId);
        setView({ kind: 'lesson', sectionId: sectionId as SectionId });
      }}
    />
  );
}
