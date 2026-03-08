import { describe, expect, it } from 'vitest';

import {
  MOBILE_EXPORT_SMOKE_ROUTES,
  evaluateRouteSamples,
} from './check-kangur-mobile-export-smoke';

describe('evaluateRouteSamples', () => {
  it('passes when restoring copy is present and no fallback appears', () => {
    const route = MOBILE_EXPORT_SMOKE_ROUTES[0];
    const result = evaluateRouteSamples(route, [
      {
        label: 'domcontentloaded',
        text: 'Status: restoring\nRestoring learner session and recent results...',
      },
      {
        label: 'networkidle',
        text: 'Status: authenticated\nCalendar\nClock',
      },
    ]);

    expect(result).toEqual({
      missingFinal: [],
      sawFallback: false,
      sawRestoring: true,
    });
  });

  it('flags fallback copy and missing final markers', () => {
    const route = MOBILE_EXPORT_SMOKE_ROUTES[4];
    const result = evaluateRouteSamples(route, [
      {
        label: 'domcontentloaded',
        text: 'Restoring learner session and leaderboard...',
      },
      {
        label: 'networkidle',
        text: 'Leaderboard unavailable',
      },
    ]);

    expect(result).toEqual({
      missingFinal: ['Ty'],
      sawFallback: true,
      sawRestoring: true,
    });
  });
});

