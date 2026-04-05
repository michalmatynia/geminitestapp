import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { describe, expect, it } from 'vitest';

import { buildKangurAssignments } from './assignments';

const createProgressWithMastery = () => ({
  ...createDefaultKangurProgressState(),
  gamesPlayed: 12,
  lessonMastery: {
    adding: {
      attempts: 3,
      bestScorePercent: 80,
      completions: 3,
      lastCompletedAt: '2026-03-06T11:00:00.000Z',
      lastScorePercent: 70,
      masteryPercent: 67,
    },
    clock: {
      attempts: 4,
      bestScorePercent: 100,
      completions: 4,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
      lastScorePercent: 90,
      masteryPercent: 92,
    },
    division: {
      attempts: 2,
      bestScorePercent: 60,
      completions: 2,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
      lastScorePercent: 40,
      masteryPercent: 45,
    },
  },
});

describe('kangur-core assignment localization', () => {
  it('localizes targeted assignments in English', () => {
    const assignments = buildKangurAssignments(createProgressWithMastery(), 3, 'en');

    expect(assignments[0]).toMatchObject({
      action: {
        label: 'Open lesson',
      },
      description: 'This is one of the weakest areas (45%). A quick review and another attempt are needed.',
      id: 'lesson-retry-division',
      target: '1 review + min. 75% score',
      title: '➗ Review: Division',
    });
    expect(assignments[1]).toMatchObject({
      id: 'lesson-retry-adding',
      title: '➕ Review: Addition',
    });
    expect(assignments[2]).toMatchObject({
      action: {
        label: 'Practice now',
      },
      id: 'mixed-practice',
      title: 'Targeted practice',
    });
  });

  it('localizes the starter assignment in German', () => {
    const assignments = buildKangurAssignments(
      {
        ...createProgressWithMastery(),
        gamesPlayed: 1,
        lessonMastery: {},
      },
      2,
      'de',
    );

    expect(assignments[0]).toMatchObject({
      action: {
        label: 'Lektion öffnen',
      },
      description: 'Starte die erste Lektion, um Daten über die starken Seiten des Lernenden zu sammeln.',
      id: 'lesson-start',
      target: '1 Lektion',
      title: 'Erste Einstiegslektion',
    });
    expect(assignments[1]).toMatchObject({
      action: {
        label: 'Jetzt trainieren',
      },
      id: 'mixed-practice',
      target: '8 Fragen',
    });
  });
});
