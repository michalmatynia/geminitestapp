import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { KangurConfirmModal } from '@/features/kangur/ui/components/KangurConfirmModal';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide as LessonSlideSectionSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { cn } from '@/shared/utils';

import ClockTrainingGame, {
  type ClockTrainingSectionId,
} from './ClockTrainingGame';

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
type ClockTrainingPanelId = 'learn' | 'pick_one' | 'pick_two' | 'challenge';
type ClockChallengeMedal = 'gold' | 'silver' | 'bronze';
type ClockPracticeTask = {
  hours: number;
  minutes: number;
};

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
        <circle
          cx='100'
          cy='100'
          r='95'
          fill='var(--kangur-soft-card-background)'
          stroke='#6366f1'
          strokeWidth='4'
        />
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
      {label ? (
        <KangurLessonCaption className='font-semibold'>
          {label}
        </KangurLessonCaption>
      ) : null}
    </div>
  );
}

const HOURS_SLIDES: LessonSlide[] = [
  {
    title: 'Co pokazuje krótka wskazówka?',
    tts: 'Krótka wskazówka pokazuje godzinę. Na tej sekcji patrzymy tylko na nią.',
    content: (
      <KangurLessonStack className='text-center'>
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
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          Patrzymy na <strong className='text-red-600'>krótką wskazówkę</strong>. Ona mówi nam,
          która jest godzina.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Pełne godziny (:00)',
    tts: 'Gdy jest pełna godzina, odczytujemy tylko godzinę z krótkiej wskazówki.',
    content: (
      <KangurLessonStack className='text-center'>
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
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          W tej sekcji trenujemy tylko odczyt godziny: 1, 6, 11.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Szybki test godzin',
    tts: 'Spójrz na krótką wskazówkę i nazwij godzinę. Minuty pomijamy.',
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock
          hours={9}
          minutes={0}
          highlightHour
          showMinuteHand={false}
          label='Jaka to godzina?'
        />
        <KangurLessonCallout accent='rose' className='max-w-xs text-left'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>Krok:</p>
          <KangurLessonCaption align='left' className='mt-1'>
            1. Znajdź krótką wskazówkę.
            <br />
            2. Odczytaj numer, na który pokazuje.
          </KangurLessonCaption>
          <p className='text-red-700 font-extrabold mt-2'>Wynik: 9:00</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const MINUTES_SLIDES: LessonSlide[] = [
  {
    title: 'Co pokazuje długa wskazówka?',
    tts: 'Długa wskazówka pokazuje minuty. W tej sekcji skupiamy się tylko na minutach.',
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock
          hours={12}
          minutes={20}
          highlightMinute
          showHourHand={false}
          label='Długa wskazówka = minuty'
        />
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          <strong className='text-green-600'>Długa wskazówka</strong> chodzi po tarczy i mówi,
          ile minut minęło.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Mapa minut co 5',
    tts: 'Każdy numer to kolejne pięć minut: 1 to 5, 2 to 10, 3 to 15 i tak dalej.',
    content: (
      <KangurLessonStack className='text-center'>
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
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          Zapamiętaj: każda kolejna liczba to +5 minut.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Szybki test minut',
    tts: 'Patrz tylko na długą wskazówkę i nazwij minuty.',
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock
          hours={12}
          minutes={35}
          highlightMinute
          showHourHand={false}
          label='Jaka to liczba minut?'
        />
        <KangurLessonCallout accent='emerald' className='max-w-xs text-left'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>Krok:</p>
          <KangurLessonCaption align='left' className='mt-1'>
            Długa wskazówka stoi przy 7.
            <br />
            7 × 5 = 35 minut.
          </KangurLessonCaption>
          <p className='text-green-700 font-extrabold mt-2'>Wynik: :35</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const COMBINED_SLIDES: LessonSlide[] = [
  {
    title: 'Jak łączyć obie wskazówki?',
    tts: 'Najpierw czytamy godzinę z krótkiej wskazówki, potem minuty z długiej.',
    content: (
      <KangurLessonStack className='text-center'>
        <AnalogClock hours={8} minutes={30} label='Przykład: 8:30' />
        <KangurLessonCallout accent='indigo' className='max-w-xs text-left space-y-2'>
          <p className='font-semibold [color:var(--kangur-page-text)]'>Kroki:</p>
          <KangurLessonCaption align='left'>
            1. Krótka wskazówka: godzina = 8
          </KangurLessonCaption>
          <KangurLessonCaption align='left'>
            2. Długa wskazówka: minuty = 30
          </KangurLessonCaption>
          <p className='text-indigo-700 font-extrabold'>Wynik: 8:30</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Kwadrans po i kwadrans do',
    tts: 'Długa wskazówka na 3 to kwadrans po, a na 9 to kwadrans do następnej godziny.',
    content: (
      <KangurLessonStack className='text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock hours={5} minutes={15} label='5:15 - kwadrans po 5' />
          <AnalogClock hours={5} minutes={45} label='5:45 - kwadrans do 6' />
        </div>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          Odczytujemy godzinę i minuty jednocześnie.
        </KangurLessonCaption>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Gotowy/a na ćwiczenie',
    tts: 'Teraz potrafisz czytać godziny i minuty razem. Przejdź do ćwiczenia.',
    content: (
      <KangurLessonStack className='text-center'>
        <div className='text-7xl'>✨</div>
        <KangurLessonCaption className='max-w-xs leading-relaxed'>
          Brawo! Umiesz:
          <br />
          🔴 czytać godziny,
          <br />
          🟢 czytać minuty,
          <br />
          ✅ łączyć obie wskazówki w pełny czas.
        </KangurLessonCaption>
      </KangurLessonStack>
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
const TRAINING_PANEL_TASKS: Record<
  ClockTrainingSectionId,
  Record<Exclude<ClockTrainingPanelId, 'challenge'>, ClockPracticeTask[]>
> = {
  hours: {
    learn: [
      { hours: 3, minutes: 0 },
      { hours: 5, minutes: 0 },
      { hours: 7, minutes: 0 },
      { hours: 9, minutes: 0 },
      { hours: 12, minutes: 0 },
    ],
    pick_one: [
      { hours: 7, minutes: 0 },
      { hours: 1, minutes: 0 },
      { hours: 4, minutes: 0 },
      { hours: 8, minutes: 0 },
      { hours: 10, minutes: 0 },
    ],
    pick_two: [
      { hours: 11, minutes: 0 },
      { hours: 2, minutes: 0 },
      { hours: 6, minutes: 0 },
      { hours: 8, minutes: 0 },
      { hours: 12, minutes: 0 },
    ],
  },
  minutes: {
    learn: [
      { hours: 12, minutes: 15 },
      { hours: 12, minutes: 5 },
      { hours: 12, minutes: 10 },
      { hours: 12, minutes: 20 },
      { hours: 12, minutes: 25 },
    ],
    pick_one: [
      { hours: 12, minutes: 35 },
      { hours: 12, minutes: 30 },
      { hours: 12, minutes: 40 },
      { hours: 12, minutes: 45 },
      { hours: 12, minutes: 50 },
    ],
    pick_two: [
      { hours: 12, minutes: 45 },
      { hours: 12, minutes: 55 },
      { hours: 12, minutes: 15 },
      { hours: 12, minutes: 25 },
      { hours: 12, minutes: 35 },
    ],
  },
  combined: {
    learn: [
      { hours: 4, minutes: 20 },
      { hours: 1, minutes: 10 },
      { hours: 2, minutes: 20 },
      { hours: 7, minutes: 10 },
      { hours: 9, minutes: 20 },
    ],
    pick_one: [
      { hours: 8, minutes: 35 },
      { hours: 3, minutes: 25 },
      { hours: 5, minutes: 35 },
      { hours: 10, minutes: 25 },
      { hours: 11, minutes: 35 },
    ],
    pick_two: [
      { hours: 6, minutes: 50 },
      { hours: 1, minutes: 40 },
      { hours: 3, minutes: 50 },
      { hours: 8, minutes: 40 },
      { hours: 11, minutes: 55 },
    ],
  },
};

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
    const reward = createLessonCompletionReward(progress, 'clock', 100);
    addXp(reward.xp, reward.progressUpdates);
    lessonCompletionAwardedRef.current = true;
  }, [isClockLessonComplete]);

  const handleStartTraining = useCallback((sectionId: ClockTrainingSectionId) => {
    setView({ kind: 'training', sectionId });
  }, []);

  const [activeTrainingPanelBySection, setActiveTrainingPanelBySection] = useState<
    Record<ClockTrainingSectionId, ClockTrainingPanelId>
  >({
    hours: 'learn',
    minutes: 'learn',
    combined: 'learn',
  });
  const [completedTrainingPanelsBySection, setCompletedTrainingPanelsBySection] = useState<
    Record<
      ClockTrainingSectionId,
      Partial<Record<ClockTrainingPanelId, boolean>>
    >
  >({
    hours: {},
    minutes: {},
    combined: {},
  });
  const [challengeMedalBySection, setChallengeMedalBySection] = useState<
    Partial<Record<ClockTrainingSectionId, ClockChallengeMedal>>
  >({});
  const [pendingTrainingExitAction, setPendingTrainingExitAction] = useState<
    | {
        kind: 'hub';
      }
    | {
        kind: 'panel';
        panel: ClockTrainingPanelId;
      }
    | null
  >(null);

  if (view.kind === 'training') {
    const currentTrainingSection =
      TRAINING_SECTIONS.find((section) => section.id === `game_${view.sectionId}`) ??
      TRAINING_SECTIONS[0];
    if (!currentTrainingSection) {
      return <></>;
    }
    const currentTrainingPanel = activeTrainingPanelBySection[view.sectionId] ?? 'learn';
    const completedTrainingPanels = completedTrainingPanelsBySection[view.sectionId] ?? {};
    const isChallengeUnlocked =
      completedTrainingPanels.learn === true &&
      completedTrainingPanels.pick_one === true &&
      completedTrainingPanels.pick_two === true;
    const isChallengePanelCompleted = completedTrainingPanels.challenge === true;
    const currentChallengeMedal = challengeMedalBySection[view.sectionId] ?? null;

    const challengeCompletedClassName =
      currentChallengeMedal === 'gold'
        ? 'bg-yellow-400'
        : currentChallengeMedal === 'silver'
          ? 'bg-slate-300'
          : currentChallengeMedal === 'bronze'
            ? 'bg-orange-400'
            : 'bg-amber-200';

    const setTrainingPanel = (panel: ClockTrainingPanelId): void => {
      setActiveTrainingPanelBySection((currentPanels) =>
        currentPanels[view.sectionId] === panel
          ? currentPanels
          : {
            ...currentPanels,
            [view.sectionId]: panel,
          }
      );
    };

    const getNextTrainingPanelAfterPractice = (
      panel: Exclude<ClockTrainingPanelId, 'challenge'>
    ): ClockTrainingPanelId => {
      if (panel === 'learn') {
        return 'pick_one';
      }
      if (panel === 'pick_one') {
        return 'pick_two';
      }
      return 'challenge';
    };

    const markTrainingPanelCompleted = (panel: ClockTrainingPanelId): void => {
      if (completedTrainingPanels[panel]) {
        return;
      }

      const nextCompletedPanels = {
        ...completedTrainingPanels,
        [panel]: true,
      };

      setCompletedTrainingPanelsBySection((currentPanels) => ({
        ...currentPanels,
        [view.sectionId]: nextCompletedPanels,
      }));

    };

    const executeTrainingExitAction = (
      action:
        | {
            kind: 'hub';
          }
        | {
            kind: 'panel';
            panel: ClockTrainingPanelId;
          }
    ): void => {
      if (action.kind === 'hub') {
        setView({ kind: 'hub' });
        return;
      }

      setTrainingPanel(action.panel);
    };

    const requestTrainingExitAction = (
      action:
        | {
            kind: 'hub';
          }
        | {
            kind: 'panel';
            panel: ClockTrainingPanelId;
          }
    ): void => {
      if (currentTrainingPanel !== 'challenge') {
        executeTrainingExitAction(action);
        return;
      }

      setPendingTrainingExitAction(action);
    };

    const trainingPanels = [
      {
        activeClassName: 'bg-indigo-500',
        completedClassName: 'bg-indigo-300',
        id: 'learn' as const,
        label: 'zadanie 1',
      },
      {
        activeClassName: 'bg-indigo-500',
        completedClassName: 'bg-indigo-300',
        id: 'pick_one' as const,
        label: 'zadanie 2',
      },
      {
        activeClassName: 'bg-indigo-500',
        completedClassName: 'bg-indigo-300',
        id: 'pick_two' as const,
        label: 'zadanie 3',
      },
      ...(isChallengeUnlocked
        ? [
          {
            activeClassName: 'bg-amber-500',
            completedClassName: challengeCompletedClassName,
            id: 'challenge' as const,
            label: 'wyzwanie',
          },
        ]
        : []),
    ];
    const currentTrainingPanelIndex = trainingPanels.findIndex(
      (panel) => panel.id === currentTrainingPanel
    );

    const trainingPills = (
      <div className='flex gap-2'>
        {trainingPanels.map((panel) => {
          const isActive = currentTrainingPanel === panel.id;
          const isCompleted =
            panel.id === 'challenge'
              ? isChallengePanelCompleted
              : completedTrainingPanels[panel.id] === true;
          const medalClassName =
            panel.id === 'challenge' && isChallengePanelCompleted
              ? challengeCompletedClassName
              : null;

          return (
            <button
              key={panel.id}
              type='button'
              onClick={() => {
                if (panel.id === currentTrainingPanel) {
                  return;
                }

                requestTrainingExitAction({ kind: 'panel', panel: panel.id });
              }}
              aria-label={`Przejdz do panelu ${panel.label}`}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                KANGUR_STEP_PILL_CLASSNAME,
                'h-[14px] min-w-[14px] cursor-pointer',
                isActive
                  ? ['w-8 scale-[1.04]', medalClassName ?? panel.activeClassName]
                  : isCompleted
                    ? ['w-6', medalClassName ?? panel.completedClassName]
                    : KANGUR_PENDING_STEP_PILL_CLASSNAME
              )}
              data-testid={`clock-lesson-training-panel-${panel.id}`}
            />
          );
        })}
      </div>
    );

    const trainingFooterNavigation = (
      <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        {currentTrainingPanelIndex > 0 ? (
          <KangurButton
            onClick={() =>
              requestTrainingExitAction({
                kind: 'panel',
                panel: trainingPanels[currentTrainingPanelIndex - 1]!.id,
              })
            }
            aria-label='Poprzedni panel'
            className='w-full justify-center px-5 shadow-sm [border-color:var(--kangur-soft-card-border)] sm:min-w-[72px] sm:w-auto'
            data-testid='clock-lesson-training-prev-button'
            size='sm'
            type='button'
            title='Poprzedni panel'
            variant='surface'
          >
            <ChevronLeft className='h-4 w-4 flex-shrink-0' />
          </KangurButton>
        ) : (
          <div className='hidden sm:block sm:min-w-[72px]' />
        )}

        {currentTrainingPanelIndex >= 0 && currentTrainingPanelIndex < trainingPanels.length - 1 ? (
          <KangurButton
            onClick={() =>
              requestTrainingExitAction({
                kind: 'panel',
                panel: trainingPanels[currentTrainingPanelIndex + 1]!.id,
              })
            }
            aria-label='Nastepny panel'
            className='w-full justify-center px-5 shadow-sm [border-color:var(--kangur-soft-card-border)] sm:min-w-[72px] sm:w-auto'
            data-testid='clock-lesson-training-next-button'
            size='sm'
            type='button'
            title='Nastepny panel'
            variant='surface'
          >
            <ChevronRight className='h-4 w-4 flex-shrink-0' />
          </KangurButton>
        ) : (
          <div className='hidden sm:block sm:min-w-[72px]' />
        )}
      </div>
    );
    const nextTrainingPanel =
      currentTrainingPanelIndex >= 0 && currentTrainingPanelIndex < trainingPanels.length - 1
        ? trainingPanels[currentTrainingPanelIndex + 1]!.id
        : null;

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

    const trainingBody = (
      <ClockTrainingGame
        key={`${view.sectionId}-${currentTrainingPanel}`}
        completionPrimaryActionLabel={
          currentTrainingPanel === 'challenge'
            ? 'Zakończ lekcję ✅'
            : nextTrainingPanel === 'challenge'
              ? 'Otwórz wyzwanie'
              : 'Następne zadanie'
        }
        enableAdaptiveRetry={false}
        hideModeSwitch
        initialMode={currentTrainingPanel === 'challenge' ? 'challenge' : 'practice'}
        onCompletionPrimaryAction={() => {
          if (currentTrainingPanel !== 'challenge' && nextTrainingPanel) {
            setTrainingPanel(nextTrainingPanel);
            return;
          }

          setView({ kind: 'hub' });
        }}
        onFinish={() => setView({ kind: 'hub' })}
        onPracticeCompleted={() => {
          if (currentTrainingPanel !== 'challenge') {
            markTrainingPanelCompleted(currentTrainingPanel);
            setTrainingPanel(getNextTrainingPanelAfterPractice(currentTrainingPanel));
          }
        }}
        onChallengeSuccess={(result) => {
          markTrainingPanelCompleted('challenge');
          setChallengeMedalBySection((currentMedals) => ({
            ...currentMedals,
            [view.sectionId]: result.medal ?? 'bronze',
          }));
        }}
        practiceTasks={
          currentTrainingPanel === 'challenge'
            ? undefined
            : TRAINING_PANEL_TASKS[view.sectionId][currentTrainingPanel]
        }
        section={view.sectionId}
        showTaskTitle={currentTrainingPanel === 'learn'}
        showTimeDisplay={currentTrainingPanel === 'learn'}
      />
    );

    return (
      <>
        <LessonActivityStage
          accent='indigo'
          description={currentTrainingSection.description}
          footerNavigation={trainingFooterNavigation}
          headerTestId='clock-lesson-training-header'
          icon='🕐'
          maxWidthClassName='max-w-lg'
          navigationPills={trainingPills}
          onBack={() => requestTrainingExitAction({ kind: 'hub' })}
          sectionHeader={currentTrainingHeader}
          shellTestId='clock-lesson-training-shell'
          title={currentTrainingSection.title}
        >
          {trainingBody}
        </LessonActivityStage>
        <KangurConfirmModal
          cancelText='Zostań'
          confirmText='Opuść wyzwanie'
          isOpen={pendingTrainingExitAction !== null}
          message='Jeśli opuścisz Tryb Wyzwanie teraz, to wyzwanie zostanie niezaliczone.'
          onClose={() => setPendingTrainingExitAction(null)}
          onConfirm={() => {
            if (!pendingTrainingExitAction) {
              return;
            }

            const action = pendingTrainingExitAction;
            setPendingTrainingExitAction(null);
            executeTrainingExitAction(action);
          }}
          title='Opuścić wyzwanie?'
        />
      </>
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

  const lessonHubSectionsWithGameProgress = lessonHubSections.map((section) => {
    if (!section.isGame) {
      return section;
    }

    const trainingSectionId =
      section.id === 'game_hours'
        ? 'hours'
        : section.id === 'game_minutes'
          ? 'minutes'
          : section.id === 'game_combined'
            ? 'combined'
            : null;

    if (!trainingSectionId) {
      return section;
    }

    const completedPanels = completedTrainingPanelsBySection[trainingSectionId] ?? {};
    const viewedCount = [
      completedPanels.learn,
      completedPanels.pick_one,
      completedPanels.pick_two,
    ].filter((value) => value === true).length;

    return {
      ...section,
      progress: {
        totalCount: 3,
        viewedCount,
      },
    };
  });

  return (
    <LessonHub
      lessonEmoji='🕐'
      lessonTitle='Nauka zegara'
      gradientClass='from-indigo-400 to-purple-500'
      progressDotClassName='bg-indigo-200'
      sections={lessonHubSectionsWithGameProgress}
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
