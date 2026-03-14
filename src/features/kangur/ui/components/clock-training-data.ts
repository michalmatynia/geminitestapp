import type {
  ClockTask,
  ClockTrainingSectionContent,
  ClockTrainingTaskPoolId,
} from './clock-training-utils';

export const CLOCK_TRAINING_TASKS: Record<ClockTrainingTaskPoolId, ClockTask[]> = {
  mixed: [
    { hours: 3, minutes: 0 },
    { hours: 7, minutes: 30 },
    { hours: 1, minutes: 15 },
    { hours: 10, minutes: 45 },
    { hours: 6, minutes: 0 },
    { hours: 4, minutes: 20 },
    { hours: 9, minutes: 35 },
    { hours: 12, minutes: 0 },
    { hours: 2, minutes: 50 },
    { hours: 11, minutes: 25 },
  ],
  hours: [
    { hours: 1, minutes: 0 },
    { hours: 3, minutes: 0 },
    { hours: 4, minutes: 0 },
    { hours: 6, minutes: 0 },
    { hours: 7, minutes: 0 },
    { hours: 9, minutes: 0 },
    { hours: 11, minutes: 0 },
    { hours: 12, minutes: 0 },
  ],
  minutes: [
    { hours: 12, minutes: 5 },
    { hours: 12, minutes: 10 },
    { hours: 12, minutes: 15 },
    { hours: 12, minutes: 20 },
    { hours: 12, minutes: 25 },
    { hours: 12, minutes: 30 },
    { hours: 12, minutes: 35 },
    { hours: 12, minutes: 40 },
    { hours: 12, minutes: 45 },
    { hours: 12, minutes: 50 },
    { hours: 12, minutes: 55 },
  ],
  combined: [
    { hours: 1, minutes: 15 },
    { hours: 2, minutes: 50 },
    { hours: 4, minutes: 20 },
    { hours: 5, minutes: 45 },
    { hours: 7, minutes: 30 },
    { hours: 8, minutes: 10 },
    { hours: 9, minutes: 35 },
    { hours: 10, minutes: 25 },
    { hours: 11, minutes: 40 },
    { hours: 12, minutes: 5 },
  ],
};

const CLOCK_TRAINING_SECTION_CONTENT: Record<ClockTrainingTaskPoolId, ClockTrainingSectionContent> =
  {
    hours: {
      accent: 'rose',
      promptLabel: 'Ustaw pełną godzinę',
    },
    minutes: {
      accent: 'emerald',
      promptLabel: 'Ustaw minuty na tarczy',
    },
    combined: {
      accent: 'indigo',
      guidance:
        'Najpierw ustaw godzinę krótką wskazówką, potem dopracuj minuty długą wskazówką.',
      guidanceTitle: 'Pełny odczyt czasu',
      legend: 'Ćwiczysz oba ruchy naraz: godziny i minuty.',
      promptLabel: 'Ustaw pełny czas',
    },
    mixed: {
      accent: 'amber',
      guidance:
        'Raz ćwiczysz pełne godziny, raz minuty, a raz cały odczyt czasu. Korzystaj z obu wskazówek.',
      guidanceTitle: 'Mieszany trening zegara',
      legend: 'Łącz krótką i długą wskazówkę zależnie od zadania.',
      promptLabel: 'Ustaw zegar na godzinę',
    },
  };

export function getClockTrainingSectionContent(
  section: ClockTrainingTaskPoolId
): ClockTrainingSectionContent {
  return CLOCK_TRAINING_SECTION_CONTENT[section] ?? CLOCK_TRAINING_SECTION_CONTENT.mixed;
}
