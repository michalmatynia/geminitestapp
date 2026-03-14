import { useCallback, useRef, useState } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide as LessonSlideSectionSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  CalendarDateFormatAnimation,
  CalendarDateHighlightAnimation,
  CalendarDaysStripAnimation,
  CalendarMonthLengthAnimation,
  CalendarMonthsLoopAnimation,
  CalendarSeasonsCycleAnimation,
  CalendarWeekendPulseAnimation,
} from '@/features/kangur/ui/components/CalendarLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurDisplayEmoji } from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

import CalendarInteractiveGame, {
  type CalendarInteractiveSectionId,
} from './CalendarInteractiveGame';

type LessonSectionId = 'intro' | 'dni' | 'miesiace' | 'data';
type TrainingCardId = 'game_days' | 'game_months' | 'game_dates';
type CalendarHubId = LessonSectionId | TrainingCardId;

type LessonSlide = LessonSlideSectionSlide & {
  tts: string;
};

type LegacyCalendarHubSection = {
  id: LessonSectionId | 'game';
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};

type CalendarLiveHubSection = {
  id: CalendarHubId;
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};

type CalendarLessonView =
  | { kind: 'hub' }
  | { kind: 'lesson'; sectionId: LessonSectionId }
  | { kind: 'training'; sectionId: CalendarInteractiveSectionId };

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

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= monthData.days; day += 1) {
    cells.push(day);
  }

  return (
    <KangurLessonCallout accent='slate' className='mx-auto max-w-xs' padding='sm'>
      <p className='mb-2 text-center font-extrabold text-indigo-700'>
        {monthData.name} {year}
      </p>
      <div className='grid grid-cols-7 gap-0.5 text-center text-xs'>
        {DAYS.map((dayLabel, index) => (
          <div
            key={dayLabel}
            className={`py-1 font-bold ${
              index >= 5
                ? 'text-red-500'
                : '[color:color-mix(in_srgb,var(--kangur-page-muted-text)_92%,white)]'
            }`}
          >
            {dayLabel}
          </div>
        ))}
        {cells.map((day, index) => (
          <div
            key={`${index}-${day ?? 'empty'}`}
            className={`rounded-full py-1 text-sm font-semibold ${
              day === highlightDay
                ? 'bg-indigo-500 text-white'
                : day !== null && index % 7 >= 5
                  ? 'text-red-400'
                  : day !== null
                    ? '[color:var(--kangur-page-text)]'
                    : ''
            }`}
          >
            {day ?? ''}
          </div>
        ))}
      </div>
    </KangurLessonCallout>
  );
}

export const SECTION_SLIDES: Record<LessonSectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Czym jest kalendarz?',
      tts: 'Kalendarz to sposób organizowania czasu. Rok ma 12 miesięcy i 365 dni. Tydzień ma 7 dni.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurDisplayEmoji data-testid='calendar-lesson-intro-emoji' size='lg'>
            📅
          </KangurDisplayEmoji>
          <KangurLessonCaption className='max-w-xs leading-relaxed'>
            Kalendarz to sposób organizowania czasu.
            <br />
            <br />
            📆 Rok ma <strong>12 miesięcy</strong> i <strong>365 dni</strong>.
            <br />
            🗓️ Tydzień ma <strong>7 dni</strong>.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Rok w pętli',
      tts: 'Miesiące wracają co roku w tej samej kolejności.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='emerald' className='max-w-xs'>
            <div className='mx-auto h-48 w-48 sm:h-56 sm:w-56'>
              <CalendarMonthsLoopAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Styczeń po grudniu znów wraca.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Pory roku',
      tts: 'Mamy cztery pory roku, które powtarzają się cyklicznie.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='emerald' className='max-w-xs'>
            <div className='mx-auto h-48 w-48 sm:h-56 sm:w-56'>
              <CalendarSeasonsCycleAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Wiosna, lato, jesień, zima.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  dni: [
    {
      title: 'Dni tygodnia',
      tts: 'Tydzień ma 7 dni: Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela.',
      content: (
        <div className='mx-auto flex w-full max-w-xs flex-col gap-2 text-center'>
          {['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'].map((dayLabel, index) => (
            <KangurLessonCallout
              key={dayLabel}
              accent='indigo'
              className='flex w-full items-center gap-3'
              padding='sm'
            >
              <span className='w-5 font-bold text-indigo-500'>{index + 1}.</span>
              <span className='font-semibold [color:var(--kangur-page-text)]'>{dayLabel}</span>
              <span className='ml-auto text-xs text-indigo-400'>📚 Szkoła</span>
            </KangurLessonCallout>
          ))}
          {['Sobota', 'Niedziela'].map((dayLabel, index) => (
            <KangurLessonCallout
              key={dayLabel}
              accent='rose'
              className='flex w-full items-center gap-3'
              padding='sm'
            >
              <span className='w-5 font-bold text-pink-500'>{index + 6}.</span>
              <span className='font-semibold [color:var(--kangur-page-text)]'>{dayLabel}</span>
              <span className='ml-auto text-xs text-pink-400'>🎉 Weekend</span>
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
    {
      title: 'Tydzień w rytmie',
      tts: 'Dni tygodnia następują po sobie w stałej kolejności.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='indigo' className='max-w-xs'>
            <div className='mx-auto h-24 w-72'>
              <CalendarDaysStripAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Po niedzieli znowu jest poniedziałek.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Weekend',
      tts: 'Sobota i niedziela to weekend.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='rose' className='max-w-xs'>
            <div className='mx-auto h-24 w-72'>
              <CalendarWeekendPulseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Weekend wyróżnia się kolorem.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  miesiace: [
    {
      title: '12 miesięcy roku',
      tts: 'Rok ma 12 miesięcy podzielonych na cztery pory roku.',
      content: (
        <KangurLessonStack className='w-full max-w-sm text-center' gap='sm'>
          <div className='grid w-full grid-cols-1 gap-3 min-[360px]:grid-cols-2'>
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
                season: '🍂 Jesień',
                months: [MONTHS[8], MONTHS[9], MONTHS[10]],
                accent: 'rose' as const,
              },
              {
                season: '❄️ Zima',
                months: [MONTHS[11], MONTHS[0], MONTHS[1]],
                accent: 'sky' as const,
              },
            ].map((group) => (
              <KangurLessonCallout key={group.season} accent={group.accent} padding='sm'>
                <p className='mb-1 text-sm font-bold [color:var(--kangur-page-text)]'>
                  {group.season}
                </p>
                {group.months.map((month) => (
                  <p key={month.name} className='text-sm [color:var(--kangur-page-text)]'>
                    <span className='font-bold'>{month.num}.</span> {month.name}{' '}
                    <span className='[color:var(--kangur-page-muted-text)]'>({month.days}d)</span>
                  </p>
                ))}
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Ile dni ma miesiąc?',
      tts: 'Większość miesięcy ma 30 lub 31 dni. Luty ma tylko 28 dni.',
      content: (
        <KangurLessonStack className='text-center'>
          <div className='grid w-full max-w-sm grid-cols-2 gap-2 min-[420px]:grid-cols-3'>
            {MONTHS.map((month) => (
              <KangurLessonCallout
                key={month.name}
                accent={month.days === 31 ? 'indigo' : month.days === 30 ? 'teal' : 'rose'}
                className='rounded-xl text-center text-sm font-semibold'
                padding='sm'
              >
                <div className='font-bold'>{month.name}</div>
                <div className='text-xs'>{month.days} dni</div>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Koło miesięcy',
      tts: 'Miesiące ustawiają się w kole i powtarzają co roku.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='emerald' className='max-w-xs'>
            <div className='mx-auto h-32 w-32'>
              <CalendarMonthsLoopAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Miesiące krążą bez końca.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Długość miesięcy',
      tts: 'Niektóre miesiące mają 31 dni, inne 30, a luty 28.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='emerald' className='max-w-xs'>
            <div className='mx-auto h-24 w-72'>
              <CalendarMonthLengthAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Zapamiętaj długości miesięcy.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  data: [
    {
      title: 'Jak czytać datę?',
      tts: 'Datę zapisujemy jako dzień, miesiąc, rok. Na przykład 15 marca 2025.',
      content: (
        <KangurLessonStack className='text-center'>
          <MiniCalendar month={3} year={2025} highlightDay={15} />
          <KangurLessonCallout accent='indigo' className='max-w-xs space-y-2 text-left'>
            <p className='font-semibold [color:var(--kangur-page-text)]'>Jak zapisać datę?</p>
            <KangurLessonCaption align='left'>
              📅 <strong>15 marca 2025</strong>
            </KangurLessonCaption>
            <KangurLessonCaption align='left'>
              📝 Lub: <strong>15/03/2025</strong>
            </KangurLessonCaption>
            <p className='mt-1 font-bold text-indigo-700'>Dzień / Miesiąc / Rok</p>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Zapis daty',
      tts: 'Datę zapisujemy jako dzień, miesiąc i rok, na przykład 15/03/2025.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='indigo' className='max-w-xs'>
            <div className='mx-auto h-24 w-72'>
              <CalendarDateFormatAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Dzień / Miesiąc / Rok.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Znajdź dzień',
      tts: 'W kalendarzu wybieramy konkretny dzień.',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='indigo' className='max-w-xs'>
            <div className='mx-auto h-32 w-56'>
              <CalendarDateHighlightAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Wskaż właściwą datę.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS: LegacyCalendarHubSection[] = [
  { id: 'intro', emoji: '📅', title: 'Czym jest kalendarz?', description: 'Rok, miesiące i dni' },
  { id: 'dni', emoji: '🗓️', title: 'Dni tygodnia', description: 'Od poniedzialku do niedzieli' },
  {
    id: 'miesiace',
    emoji: '🌸',
    title: 'Miesiące i pory roku',
    description: '12 miesięcy i ich pory roku',
  },
  { id: 'data', emoji: '📝', title: 'Jak czytać datę?', description: 'Dzień / miesiąc / rok' },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Ćwiczenia z Kalendarzem',
    description: 'Cwicz w interaktywnej grze',
    isGame: true,
  },
];

const LIVE_HUB_SECTIONS: CalendarLiveHubSection[] = [
  { id: 'intro', emoji: '📅', title: 'Czym jest kalendarz?', description: 'Rok, miesiące i dni' },
  { id: 'dni', emoji: '🗓️', title: 'Dni tygodnia', description: 'Od poniedzialku do niedzieli' },
  {
    id: 'miesiace',
    emoji: '🌸',
    title: 'Miesiące i pory roku',
    description: '12 miesięcy i ich pory roku',
  },
  { id: 'data', emoji: '📝', title: 'Jak czytać datę?', description: 'Dzień / miesiąc / rok' },
  {
    id: 'game_days',
    emoji: '🗓️',
    title: 'Ćwiczenie: Dni tygodnia',
    description: 'Weekend, dni tygodnia i układ kolumn',
    isGame: true,
  },
  {
    id: 'game_months',
    emoji: '🌸',
    title: 'Ćwiczenie: Miesiące',
    description: 'Miesiące, kolejność i pory roku',
    isGame: true,
  },
  {
    id: 'game_dates',
    emoji: '📝',
    title: 'Ćwiczenie: Daty',
    description: 'Wyszukuj właściwe daty w kalendarzu',
    isGame: true,
  },
];

const TRAINING_SECTIONS: Array<CalendarLiveHubSection & { isGame: true }> = LIVE_HUB_SECTIONS.filter(
  (section): section is CalendarLiveHubSection & { isGame: true } => section.isGame === true
);

export default function CalendarLesson(): React.JSX.Element {
  const [view, setView] = useState<CalendarLessonView>({ kind: 'hub' });
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SECTION_SLIDES);
  const lessonCompletionAwardedRef = useRef(false);

  const lessonHubSections = LIVE_HUB_SECTIONS.map((section) =>
    section.isGame
      ? section
      : {
        ...section,
        progress: sectionProgress[section.id as LessonSectionId],
      }
  );

  const handleStartTraining = useCallback((sectionId: CalendarInteractiveSectionId) => {
    if (!lessonCompletionAwardedRef.current) {
      const progress = loadProgress();
      const reward = createLessonCompletionReward(progress, 'calendar', 60);
      addXp(reward.xp, reward.progressUpdates);
      lessonCompletionAwardedRef.current = true;
    }
    setView({ kind: 'training', sectionId });
  }, []);

  if (view.kind === 'training') {
    const currentTrainingSection =
      TRAINING_SECTIONS.find((section) => section.id === view.sectionId) ?? TRAINING_SECTIONS[0];
    if (!currentTrainingSection) {
      return <></>;
    }

    return (
      <LessonActivityStage
        accent='emerald'
        description={currentTrainingSection.description}
        headerTestId='calendar-lesson-game-header'
        icon='📅'
        maxWidthClassName='max-w-lg'
        onBack={() => setView({ kind: 'hub' })}
        sectionHeader={{
          description: currentTrainingSection.description,
          emoji: currentTrainingSection.emoji,
          isGame: true,
          title: currentTrainingSection.title,
        }}
        shellTestId='calendar-lesson-game-shell'
        title={currentTrainingSection.title}
      >
        <CalendarInteractiveGame
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
        slides={SECTION_SLIDES[view.sectionId]}
        sectionHeader={
          LIVE_HUB_SECTIONS.find((section) => section.id === view.sectionId) ?? null
        }
        onBack={() => setView({ kind: 'hub' })}
        onProgressChange={(viewedCount) => markSectionViewedCount(view.sectionId, viewedCount)}
        dotActiveClass='bg-emerald-500'
        dotDoneClass='bg-emerald-200'
        gradientClass='kangur-gradient-accent-emerald'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='📅'
      lessonTitle='Nauka kalendarza'
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-200'
      sections={lessonHubSections}
      onSelect={(sectionId) => {
        if (sectionId === 'game_days') {
          handleStartTraining('dni');
          return;
        }
        if (sectionId === 'game_months') {
          handleStartTraining('miesiace');
          return;
        }
        if (sectionId === 'game_dates') {
          handleStartTraining('data');
          return;
        }
        markSectionOpened(sectionId as LessonSectionId);
        setView({ kind: 'lesson', sectionId: sectionId as LessonSectionId });
      }}
    />
  );
}
