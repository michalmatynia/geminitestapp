import type {
  ClockHubSection,
  ClockPracticeTask,
  ClockTrainingPanelId,
  LessonSection,
  LessonSlide,
  SectionId,
} from './ClockLesson.types';
import type { ClockTrainingSectionId } from './clock-training-utils';
import { COMBINED_SLIDES } from './ClockLesson.data.combined';
import { HOURS_SLIDES } from './ClockLesson.data.hours';
import { MINUTES_SLIDES } from './ClockLesson.data.minutes';

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
export { COMBINED_SLIDES, HOURS_SLIDES, MINUTES_SLIDES };

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
