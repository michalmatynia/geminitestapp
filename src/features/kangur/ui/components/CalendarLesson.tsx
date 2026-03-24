'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { LessonSlide as LessonSlideSectionSlide } from '@/features/kangur/ui/components/LessonSlideSection';
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
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

import CalendarInteractiveGame, {
  type CalendarInteractiveSectionId,
} from './CalendarInteractiveGame';

type LessonSectionId = 'intro' | 'dni' | 'miesiace' | 'data';
type TrainingCardId = 'game_days' | 'game_months' | 'game_dates';
type CalendarHubId = LessonSectionId | TrainingCardId;

type LessonSlide = LessonSlideSectionSlide & {
  tts: string;
};

type CalendarLiveHubSection = {
  id: CalendarHubId;
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};

type Translate = KangurIntlTranslate;
type CalendarMonthId =
  | 'january'
  | 'february'
  | 'march'
  | 'april'
  | 'may'
  | 'june'
  | 'july'
  | 'august'
  | 'september'
  | 'october'
  | 'november'
  | 'december';
type WeekdayFullKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
type WeekdayAbbrKey =
  | 'mondayAbbr'
  | 'tuesdayAbbr'
  | 'wednesdayAbbr'
  | 'thursdayAbbr'
  | 'fridayAbbr'
  | 'saturdayAbbr'
  | 'sundayAbbr';
type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

const MONTHS = [
  { id: 'january', days: 31, num: 1 },
  { id: 'february', days: 28, num: 2 },
  { id: 'march', days: 31, num: 3 },
  { id: 'april', days: 30, num: 4 },
  { id: 'may', days: 31, num: 5 },
  { id: 'june', days: 30, num: 6 },
  { id: 'july', days: 31, num: 7 },
  { id: 'august', days: 31, num: 8 },
  { id: 'september', days: 30, num: 9 },
  { id: 'october', days: 31, num: 10 },
  { id: 'november', days: 30, num: 11 },
  { id: 'december', days: 31, num: 12 },
] as const satisfies ReadonlyArray<{
  id: CalendarMonthId;
  days: number;
  num: number;
}>;

const WEEKDAYS = [
  { fullKey: 'monday', abbrKey: 'mondayAbbr' },
  { fullKey: 'tuesday', abbrKey: 'tuesdayAbbr' },
  { fullKey: 'wednesday', abbrKey: 'wednesdayAbbr' },
  { fullKey: 'thursday', abbrKey: 'thursdayAbbr' },
  { fullKey: 'friday', abbrKey: 'fridayAbbr' },
  { fullKey: 'saturday', abbrKey: 'saturdayAbbr' },
  { fullKey: 'sunday', abbrKey: 'sundayAbbr' },
] as const satisfies ReadonlyArray<{
  fullKey: WeekdayFullKey;
  abbrKey: WeekdayAbbrKey;
}>;

const SEASON_GROUPS = [
  {
    id: 'spring',
    emoji: '🌸',
    months: [MONTHS[2], MONTHS[3], MONTHS[4]],
    accent: 'emerald' as const,
  },
  {
    id: 'summer',
    emoji: '☀️',
    months: [MONTHS[5], MONTHS[6], MONTHS[7]],
    accent: 'amber' as const,
  },
  {
    id: 'autumn',
    emoji: '🍂',
    months: [MONTHS[8], MONTHS[9], MONTHS[10]],
    accent: 'rose' as const,
  },
  {
    id: 'winter',
    emoji: '❄️',
    months: [MONTHS[11], MONTHS[0], MONTHS[1]],
    accent: 'sky' as const,
  },
] as const satisfies ReadonlyArray<{
  id: SeasonId;
  emoji: string;
  months: ReadonlyArray<(typeof MONTHS)[number]>;
  accent: 'emerald' | 'amber' | 'rose' | 'sky';
}>;

const translateMonthName = (
  miniGameTranslations: Translate,
  monthId: CalendarMonthId
): string => miniGameTranslations(`calendarInteractive.months.${monthId}`);

const translateWeekdayAbbr = (
  miniGameTranslations: Translate,
  abbrKey: WeekdayAbbrKey
): string => miniGameTranslations(`calendarInteractive.weekdays.abbr.${abbrKey}`);

const translateWeekdayFull = (
  miniGameTranslations: Translate,
  fullKey: WeekdayFullKey
): string => miniGameTranslations(`calendarInteractive.weekdays.full.${fullKey}`);

const translateSeasonName = (
  miniGameTranslations: Translate,
  seasonId: SeasonId
): string => miniGameTranslations(`calendarInteractive.seasons.${seasonId}`);

function MiniCalendar({
  month = 2,
  year = 2025,
  highlightDay,
  miniGameTranslations,
}: {
  month?: number;
  year?: number;
  highlightDay?: number;
  miniGameTranslations: Translate;
}): React.JSX.Element {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const monthData = MONTHS[month - 1] ?? MONTHS[0];
  const monthLabel = translateMonthName(miniGameTranslations, monthData.id);
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
        {monthLabel} {year}
      </p>
      <div className='grid grid-cols-7 gap-0.5 text-center text-xs'>
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={weekday.fullKey}
            className={`py-1 font-bold ${
              index >= 5
                ? 'text-red-500'
                : '[color:color-mix(in_srgb,var(--kangur-page-muted-text)_92%,white)]'
            }`}
          >
            {translateWeekdayAbbr(miniGameTranslations, weekday.abbrKey)}
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

const buildCalendarSectionSlides = (
  translations: Translate,
  miniGameTranslations: Translate
): Record<LessonSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: translations('slides.intro.whatIsCalendar.title'),
      tts: translations('slides.intro.whatIsCalendar.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurDisplayEmoji data-testid='calendar-lesson-intro-emoji' size='lg'>
            📅
          </KangurDisplayEmoji>
          <KangurLessonCaption className='max-w-xs leading-relaxed'>
            {translations('slides.intro.whatIsCalendar.body')}
            <br />
            <br />
            📆 <strong>{translations('slides.intro.whatIsCalendar.yearStat')}</strong>
            <br />
            🗓️ <strong>{translations('slides.intro.whatIsCalendar.weekStat')}</strong>
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.intro.yearLoop.title'),
      tts: translations('slides.intro.yearLoop.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='emerald' className='max-w-xs'>
            <div className='mx-auto h-48 w-48 max-w-full sm:h-56 sm:w-56'>
              <CalendarMonthsLoopAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.intro.yearLoop.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.intro.seasons.title'),
      tts: translations('slides.intro.seasons.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='emerald' className='max-w-xs'>
            <div className='mx-auto h-48 w-48 max-w-full sm:h-56 sm:w-56'>
              <CalendarSeasonsCycleAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.intro.seasons.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  dni: [
    {
      title: translations('slides.dni.weekdays.title'),
      tts: translations('slides.dni.weekdays.tts'),
      content: (
        <div className='mx-auto flex w-full max-w-xs flex-col gap-2 text-center'>
          {WEEKDAYS.slice(0, 5).map((weekday, index) => (
            <KangurLessonCallout
              key={weekday.fullKey}
              accent='indigo'
              className='flex w-full items-center kangur-panel-gap'
              padding='sm'
            >
              <span className='w-5 font-bold text-indigo-500'>{index + 1}.</span>
              <span className='font-semibold [color:var(--kangur-page-text)]'>
                {translateWeekdayFull(miniGameTranslations, weekday.fullKey)}
              </span>
              <span className='ml-auto text-xs text-indigo-400'>
                📚 {translations('labels.schoolTag')}
              </span>
            </KangurLessonCallout>
          ))}
          {WEEKDAYS.slice(5).map((weekday, index) => (
            <KangurLessonCallout
              key={weekday.fullKey}
              accent='rose'
              className='flex w-full items-center kangur-panel-gap'
              padding='sm'
            >
              <span className='w-5 font-bold text-pink-500'>{index + 6}.</span>
              <span className='font-semibold [color:var(--kangur-page-text)]'>
                {translateWeekdayFull(miniGameTranslations, weekday.fullKey)}
              </span>
              <span className='ml-auto text-xs text-pink-400'>
                🎉 {translations('labels.weekendTag')}
              </span>
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
    {
      title: translations('slides.dni.rhythm.title'),
      tts: translations('slides.dni.rhythm.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='indigo' className='max-w-xs'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <CalendarDaysStripAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.dni.rhythm.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.dni.weekend.title'),
      tts: translations('slides.dni.weekend.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='rose' className='max-w-xs'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <CalendarWeekendPulseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.dni.weekend.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  miesiace: [
    {
      title: translations('slides.miesiace.monthsOfYear.title'),
      tts: translations('slides.miesiace.monthsOfYear.tts'),
      content: (
        <KangurLessonStack className='w-full max-w-sm text-center' gap='sm'>
          <div className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
            {SEASON_GROUPS.map((group) => (
              <KangurLessonCallout key={group.id} accent={group.accent} padding='sm'>
                <p className='mb-1 text-sm font-bold [color:var(--kangur-page-text)]'>
                  {group.emoji} {translateSeasonName(miniGameTranslations, group.id)}
                </p>
                {group.months.map((month) => (
                  <p key={month.id} className='text-sm [color:var(--kangur-page-text)]'>
                    <span className='font-bold'>{month.num}.</span>{' '}
                    {translateMonthName(miniGameTranslations, month.id)}{' '}
                    <span className='[color:var(--kangur-page-muted-text)]'>
                      ({month.days} {translations('labels.daysSuffix')})
                    </span>
                  </p>
                ))}
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.miesiace.monthLength.title'),
      tts: translations('slides.miesiace.monthLength.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <div className='grid w-full max-w-sm grid-cols-2 gap-2 min-[420px]:grid-cols-3'>
            {MONTHS.map((month) => (
              <KangurLessonCallout
                key={month.id}
                accent={month.days === 31 ? 'indigo' : month.days === 30 ? 'teal' : 'rose'}
                className='rounded-xl text-center text-sm font-semibold'
                padding='sm'
              >
                <div className='font-bold'>
                  {translateMonthName(miniGameTranslations, month.id)}
                </div>
                <div className='text-xs'>
                  {month.days} {translations('labels.daysSuffix')}
                </div>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.miesiace.monthsWheel.title'),
      tts: translations('slides.miesiace.monthsWheel.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='emerald' className='max-w-xs'>
            <div className='mx-auto h-32 w-32'>
              <CalendarMonthsLoopAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.miesiace.monthsWheel.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.miesiace.lengthAnimation.title'),
      tts: translations('slides.miesiace.lengthAnimation.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='emerald' className='max-w-xs'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <CalendarMonthLengthAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.miesiace.lengthAnimation.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  data: [
    {
      title: translations('slides.data.readDate.title'),
      tts: translations('slides.data.readDate.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <MiniCalendar miniGameTranslations={miniGameTranslations} month={3} year={2025} highlightDay={15} />
          <KangurLessonCallout accent='indigo' className='max-w-xs space-y-2 text-left'>
            <p className='font-semibold [color:var(--kangur-page-text)]'>
              {translations('labels.howToWriteDate')}
            </p>
            <KangurLessonCaption align='left'>
              📅 <strong>{translations('slides.data.readDate.longExample')}</strong>
            </KangurLessonCaption>
            <KangurLessonCaption align='left'>
              📝 {translations('labels.shortDatePrefix')}{' '}
              <strong>{translations('slides.data.readDate.shortExample')}</strong>
            </KangurLessonCaption>
            <p className='mt-1 font-bold text-indigo-700'>{translations('labels.datePattern')}</p>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.data.format.title'),
      tts: translations('slides.data.format.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='indigo' className='max-w-xs'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <CalendarDateFormatAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.data.format.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.data.findDay.title'),
      tts: translations('slides.data.findDay.tts'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='indigo' className='max-w-xs'>
            <div className='mx-auto h-32 w-56 max-w-full'>
              <CalendarDateHighlightAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.data.findDay.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildCalendarHubSections = (translations: Translate): CalendarLiveHubSection[] => [
  {
    id: 'intro',
    emoji: '📅',
    title: translations('sections.intro.title'),
    description: translations('sections.intro.description'),
  },
  {
    id: 'dni',
    emoji: '🗓️',
    title: translations('sections.dni.title'),
    description: translations('sections.dni.description'),
  },
  {
    id: 'miesiace',
    emoji: '🌸',
    title: translations('sections.miesiace.title'),
    description: translations('sections.miesiace.description'),
  },
  {
    id: 'data',
    emoji: '📝',
    title: translations('sections.data.title'),
    description: translations('sections.data.description'),
  },
  {
    id: 'game_days',
    emoji: '🗓️',
    title: translations('sections.gameDays.title'),
    description: translations('sections.gameDays.description'),
    isGame: true,
  },
  {
    id: 'game_months',
    emoji: '🌸',
    title: translations('sections.gameMonths.title'),
    description: translations('sections.gameMonths.description'),
    isGame: true,
  },
  {
    id: 'game_dates',
    emoji: '📝',
    title: translations('sections.gameDates.title'),
    description: translations('sections.gameDates.description'),
    isGame: true,
  },
];

const CALENDAR_GAME_SECTION_MAP: Record<TrainingCardId, CalendarInteractiveSectionId> = {
  game_days: 'dni',
  game_months: 'miesiace',
  game_dates: 'data',
};

const CalendarGameBody = ({
  section,
  onFinish,
  onAward,
}: {
  section: CalendarInteractiveSectionId;
  onFinish: () => void;
  onAward: () => void;
}): React.JSX.Element => {
  useEffect(() => {
    onAward();
  }, [onAward]);

  return <CalendarInteractiveGame key={section} onFinish={onFinish} section={section} />;
};

export default function CalendarLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.calendar');
  const miniGameTranslations = useTranslations('KangurMiniGames');
  const { subjectKey } = useKangurSubjectFocus();
  const lessonCompletionAwardedRef = useRef(false);

  const awardLessonCompletionOnce = useCallback(() => {
    if (lessonCompletionAwardedRef.current) {
      return;
    }

    const progress = loadProgress({ ownerKey: subjectKey });
    const reward = createLessonCompletionReward(progress, 'calendar', 60);
    addXp(reward.xp, reward.progressUpdates, { ownerKey: subjectKey });
    lessonCompletionAwardedRef.current = true;
  }, [subjectKey]);

  const sections = buildCalendarHubSections(translations);
  const slides = buildCalendarSectionSlides(translations, miniGameTranslations);
  const trainingSections = sections.filter(
    (section): section is CalendarLiveHubSection & { isGame: true } => section.isGame === true
  );

  const games = trainingSections.map((section) => {
    const trainingId = section.id as TrainingCardId;
    const interactiveSection = CALENDAR_GAME_SECTION_MAP[trainingId];

    return {
      sectionId: trainingId,
      stage: {
        accent: 'emerald' as const,
        description: section.description,
        headerTestId: 'calendar-lesson-game-header',
        icon: '📅',
        maxWidthClassName: 'max-w-lg',
        shellTestId: 'calendar-lesson-game-shell',
        title: section.title,
      },
      render: ({ onBack }: { onBack: () => void }) => (
        <CalendarGameBody
          section={interactiveSection}
          onFinish={onBack}
          onAward={awardLessonCompletionOnce}
        />
      ),
    };
  });

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='calendar'
      lessonEmoji='📅'
      lessonTitle={translations('lessonTitle')}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-200'
      dotActiveClass='bg-emerald-500'
      dotDoneClass='bg-emerald-200'
      skipMarkFor={['game_days', 'game_months', 'game_dates']}
      games={games}
    />
  );
}
