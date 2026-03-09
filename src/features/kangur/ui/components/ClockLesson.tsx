import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide as LessonSlideSectionSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  buildLessonMasteryUpdate,
  XP_REWARDS,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { cn } from '@/shared/utils';

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
        <div className='text-7xl'>✨</div>
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

const TRAINING_SECTIONS: Array<ClockHubSection & { isGame: true }> = HUB_SECTIONS.filter(
  (section): section is ClockHubSection & { isGame: true } => section.isGame === true
);

const TRAINING_SECTION_ORDER: ClockTrainingSectionId[] = ['hours', 'minutes', 'combined'];

export default function ClockLesson(): React.JSX.Element {
  const [view, setView] = useState<ClockLessonView>({ kind: 'hub' });
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);
  const lessonCompletionAwardedRef = useRef(false);
  const isHoursComplete =
    (sectionProgress.hours?.totalCount ?? 0) > 0 &&
    (sectionProgress.hours?.viewedCount ?? 0) >= (sectionProgress.hours?.totalCount ?? 0);
  const isMinutesComplete =
    (sectionProgress.minutes?.totalCount ?? 0) > 0 &&
    (sectionProgress.minutes?.viewedCount ?? 0) >= (sectionProgress.minutes?.totalCount ?? 0);
  const isCombinedComplete =
    (sectionProgress.combined?.totalCount ?? 0) > 0 &&
    (sectionProgress.combined?.viewedCount ?? 0) >= (sectionProgress.combined?.totalCount ?? 0);
  const isCombinedUnlocked = isHoursComplete && isMinutesComplete;
  const isClockLessonComplete = isHoursComplete && isMinutesComplete && isCombinedComplete;
  const lessonHubSections = HUB_SECTIONS.map((section) =>
    section.isGame
      ? section
      : section.id === 'combined' && !isCombinedUnlocked
        ? {
            ...section,
            description: 'Odblokuj po ukończeniu Godzin i Minut.',
            locked: true,
            lockedLabel: 'Zablokowane',
            progress: sectionProgress[section.id as SectionId],
          }
        : {
            ...section,
            progress: sectionProgress[section.id as SectionId],
          }
  );

  useEffect(() => {
    if (!isClockLessonComplete || lessonCompletionAwardedRef.current) {
      return;
    }

    const progress = loadProgress();
    addXp(XP_REWARDS.lesson_completed, {
      lessonsCompleted: progress.lessonsCompleted + 1,
      lessonMastery: buildLessonMasteryUpdate(progress, 'clock', 100),
    });
    lessonCompletionAwardedRef.current = true;
  }, [isClockLessonComplete]);

  const handleStartTraining = useCallback((sectionId: ClockTrainingSectionId) => {
    setView({ kind: 'training', sectionId });
  }, []);

  if (view.kind === 'training') {
    const currentTrainingIndex = TRAINING_SECTION_ORDER.indexOf(view.sectionId);
    const currentTrainingSection =
      TRAINING_SECTIONS[currentTrainingIndex] ??
      TRAINING_SECTIONS.find((section) => section.id === `game_${view.sectionId}`) ??
      TRAINING_SECTIONS[0];
    if (!currentTrainingSection) {
      return <></>;
    }
    const canGoToPreviousTraining = currentTrainingIndex > 0;
    const canGoToNextTraining = currentTrainingIndex < TRAINING_SECTION_ORDER.length - 1;

    const goToTrainingSection = (sectionId: ClockTrainingSectionId): void => {
      setView({ kind: 'training', sectionId });
    };

    const trainingPills = (
      <div className='flex gap-2'>
        {TRAINING_SECTIONS.map((section, index) => {
          const isActive = index === currentTrainingIndex;
          const isCompleted = index < currentTrainingIndex;

          return (
            <button
              key={section.id}
              type='button'
              onClick={() => goToTrainingSection(TRAINING_SECTION_ORDER[index] ?? 'hours')}
              aria-label={`Przejdź do gry ${index + 1}`}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                KANGUR_STEP_PILL_CLASSNAME,
                'h-[14px] min-w-[14px] cursor-pointer',
                isActive
                  ? ['w-8 scale-[1.04]', 'bg-indigo-500']
                  : isCompleted
                    ? ['w-6', 'bg-indigo-200']
                    : KANGUR_PENDING_STEP_PILL_CLASSNAME
              )}
              data-testid={`clock-lesson-training-indicator-${index}`}
            />
          );
        })}
      </div>
    );

    const trainingFooterNavigation = (
      <div className='flex w-full items-center justify-between gap-3'>
        {canGoToPreviousTraining ? (
          <KangurButton
            onClick={() =>
              goToTrainingSection(TRAINING_SECTION_ORDER[currentTrainingIndex - 1] ?? 'hours')
            }
            aria-label='Poprzednia gra'
            className='min-w-[72px] justify-center border-slate-300/80 bg-white/92 px-5 shadow-sm'
            data-testid='clock-lesson-training-prev-button'
            size='sm'
            type='button'
            title='Poprzednia gra'
            variant='surface'
          >
            <ChevronLeft className='h-4 w-4 flex-shrink-0' />
          </KangurButton>
        ) : (
          <div className='min-w-[72px]' />
        )}

        {canGoToNextTraining ? (
          <KangurButton
            onClick={() =>
              goToTrainingSection(TRAINING_SECTION_ORDER[currentTrainingIndex + 1] ?? 'combined')
            }
            aria-label='Następna gra'
            className='min-w-[72px] justify-center border-slate-300/80 bg-white/92 px-5 shadow-sm'
            data-testid='clock-lesson-training-next-button'
            size='sm'
            type='button'
            title='Następna gra'
            variant='surface'
          >
            <ChevronRight className='h-4 w-4 flex-shrink-0' />
          </KangurButton>
        ) : (
          <div className='min-w-[72px]' />
        )}
      </div>
    );

    const currentTrainingHeader =
      HUB_SECTIONS.find(
        (section) =>
          section.id ===
          (view.sectionId === 'hours'
            ? 'game_hours'
            : view.sectionId === 'minutes'
              ? 'game_minutes'
              : 'game_combined')
      ) ?? {
        description: currentTrainingSection.description,
        emoji: currentTrainingSection.emoji,
        isGame: true,
        title: currentTrainingSection.title,
      };

    return (
      <LessonActivityStage
        accent='indigo'
        description={currentTrainingSection.description}
        footerNavigation={trainingFooterNavigation}
        headerTestId='clock-lesson-training-header'
        icon='🕐'
        maxWidthClassName='max-w-lg'
        navigationPills={trainingPills}
        onBack={() => setView({ kind: 'hub' })}
        sectionHeader={currentTrainingHeader}
        shellTestId='clock-lesson-training-shell'
        title={currentTrainingSection.title}
      >
        <ClockTrainingGame
          key={view.sectionId}
          onFinish={() => setView({ kind: 'hub' })}
          section={view.sectionId}
        />
      </LessonActivityStage>
    );
  }

  if (view.kind === 'lesson') {
    return (
      <LessonSlideSection
        slides={SLIDES[view.sectionId]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === view.sectionId) ?? null}
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
