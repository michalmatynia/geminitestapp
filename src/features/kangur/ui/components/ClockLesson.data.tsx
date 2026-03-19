import type {
  ClockHubSection,
  ClockPracticeTask,
  ClockTrainingPanelId,
  LessonSection,
  LessonSlide,
  SectionId,
} from './ClockLesson.types';
import type { ClockTrainingSectionId } from './clock-training-utils';
import {
  buildClockCombinedSlides,
  CLOCK_COMBINED_SLIDES_COPY_PL,
  COMBINED_SLIDES,
} from './ClockLesson.data.combined';
import {
  buildClockHoursSlides,
  CLOCK_HOURS_SLIDES_COPY_PL,
  HOURS_SLIDES,
} from './ClockLesson.data.hours';
import {
  buildClockMinutesSlides,
  CLOCK_MINUTES_SLIDES_COPY_PL,
  MINUTES_SLIDES,
} from './ClockLesson.data.minutes';
import type { WidenLessonCopy } from './ClockLesson.i18n';

export type {
  ClockHubId,
  ClockHubSection,
  ClockChallengeMedal,
  ClockPracticeTask,
  ClockTrainingPanelId,
  LessonSection,
  LessonSlide,
  SectionId,
  TrainingCardId,
} from './ClockLesson.types';
export {
  buildClockCombinedSlides,
  buildClockHoursSlides,
  buildClockMinutesSlides,
  CLOCK_COMBINED_SLIDES_COPY_PL,
  CLOCK_HOURS_SLIDES_COPY_PL,
  CLOCK_MINUTES_SLIDES_COPY_PL,
  COMBINED_SLIDES,
  HOURS_SLIDES,
  MINUTES_SLIDES,
};

export const CLOCK_LESSON_COPY_PL = {
  lessonTitle: 'Nauka zegara',
  lessonSections: {
    hours: {
      title: 'Sekcja 1: Godziny (krótka wskazówka)',
      subtitle: 'Uczymy się tylko krótkiej wskazówki i pełnych godzin (:00).',
    },
    minutes: {
      title: 'Sekcja 2: Minuty (długa wskazówka)',
      subtitle: 'Uczymy się tylko długiej wskazówki i mapy minut.',
    },
    combined: {
      title: 'Sekcja 3: Godziny i Minuty razem',
      subtitle: 'Łączymy obie wskazówki i odczytujemy pełny czas.',
    },
  },
  hubSections: {
    hours: {
      title: 'Godziny',
      description: 'Krótka wskazówka i pełne godziny',
    },
    minutes: {
      title: 'Minuty',
      description: 'Długa wskazówka i liczenie co 5',
    },
    combined: {
      title: 'Łączenie wskazówek',
      description: 'Czytaj pełny czas na zegarze',
    },
    gameHours: {
      title: 'Ćwiczenie: Godziny',
      description: 'Trenuj pełne godziny i krótką wskazówkę',
    },
    gameMinutes: {
      title: 'Ćwiczenie: Minuty',
      description: 'Ćwicz długą wskazówkę i minuty co 5',
    },
    gameCombined: {
      title: 'Ćwiczenie: Pełny czas',
      description: 'Łącz godziny i minuty w pełny odczyt czasu',
    },
    combinedLockedDescription: 'Odblokuj po ukończeniu Godzin i Minut.',
    lockedLabel: 'Zablokowane',
  },
  trainingSlides: {
    hours: {
      title: 'Ćwiczenie: Godziny',
      tts:
        'Teraz przechodzisz do praktyki pełnych godzin. Ustawiaj krótką wskazówkę tak jak w pierwszym panelu ćwiczenia godzin.',
    },
    minutes: {
      title: 'Ćwiczenie: Minuty',
      tts:
        'Teraz przechodzisz do praktyki minut. Ustawiaj długą wskazówkę tak jak w pierwszym panelu ćwiczenia minut.',
    },
    combined: {
      title: 'Ćwiczenie: Pełny czas',
      tts:
        'Teraz przechodzisz do praktyki pełnego czasu. Ustawiaj obie wskazówki tak jak w pierwszym panelu ćwiczenia pełnego czasu.',
    },
  },
  training: {
    panelLabel: 'zadanie',
    goToPanel: 'Przejdź do panelu {label}',
    previousPanel: 'Poprzedni panel',
    nextPanel: 'Następny panel',
    finishLesson: 'Zakończ lekcję ✅',
    openChallenge: 'Otwórz wyzwanie',
    nextTask: 'Następne zadanie',
    backToTopics: 'Wróć do tematów',
    leaveChallengeTitle: 'Opuścić wyzwanie?',
    leaveChallengeMessage:
      'Jeśli opuścisz Tryb Wyzwanie teraz, to wyzwanie zostanie niezaliczone.',
    stay: 'Zostań',
    leaveChallenge: 'Opuść wyzwanie',
  },
} as const;

export type ClockLessonCopy = WidenLessonCopy<typeof CLOCK_LESSON_COPY_PL>;

export const buildClockLessonSections = (
  copy: ClockLessonCopy,
  hoursSlides: LessonSlide[],
  minutesSlides: LessonSlide[],
  combinedSlides: LessonSlide[]
): LessonSection[] => [
  {
    id: 'hours',
    title: copy.lessonSections.hours.title,
    subtitle: copy.lessonSections.hours.subtitle,
    slides: hoursSlides,
  },
  {
    id: 'minutes',
    title: copy.lessonSections.minutes.title,
    subtitle: copy.lessonSections.minutes.subtitle,
    slides: minutesSlides,
  },
  {
    id: 'combined',
    title: copy.lessonSections.combined.title,
    subtitle: copy.lessonSections.combined.subtitle,
    slides: combinedSlides,
  },
];

export const buildClockHubSections = (copy: ClockLessonCopy): ClockHubSection[] => [
  {
    id: 'hours',
    emoji: '🔴',
    title: copy.hubSections.hours.title,
    description: copy.hubSections.hours.description,
  },
  {
    id: 'minutes',
    emoji: '🟢',
    title: copy.hubSections.minutes.title,
    description: copy.hubSections.minutes.description,
  },
  {
    id: 'combined',
    emoji: '🕐',
    title: copy.hubSections.combined.title,
    description: copy.hubSections.combined.description,
  },
  {
    id: 'game_hours',
    emoji: '🎯',
    title: copy.hubSections.gameHours.title,
    description: copy.hubSections.gameHours.description,
    isGame: true,
  },
  {
    id: 'game_minutes',
    emoji: '🟢',
    title: copy.hubSections.gameMinutes.title,
    description: copy.hubSections.gameMinutes.description,
    isGame: true,
  },
  {
    id: 'game_combined',
    emoji: '🕐',
    title: copy.hubSections.gameCombined.title,
    description: copy.hubSections.gameCombined.description,
    isGame: true,
  },
];

export const LESSON_SECTIONS: LessonSection[] = buildClockLessonSections(
  CLOCK_LESSON_COPY_PL,
  HOURS_SLIDES,
  MINUTES_SLIDES,
  COMBINED_SLIDES
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  hours: HOURS_SLIDES,
  minutes: MINUTES_SLIDES,
  combined: COMBINED_SLIDES,
};

export const HUB_SECTIONS: ClockHubSection[] = buildClockHubSections(CLOCK_LESSON_COPY_PL);

export const TRAINING_SECTIONS: Array<ClockHubSection & { isGame: true }> = HUB_SECTIONS.filter(
  (section): section is ClockHubSection & { isGame: true } => section.isGame === true
);

export const TRAINING_PANEL_TASKS: Record<
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
