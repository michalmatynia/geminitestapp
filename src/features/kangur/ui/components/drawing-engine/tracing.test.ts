import {
  evaluateKangurTracingAttempt,
  getKangurTracingCanvasConfig,
} from '@/features/kangur/ui/components/drawing-engine/tracing';

describe('tracing helpers', () => {
  it('returns the expected coarse and fine tracing canvas config', () => {
    expect(
      getKangurTracingCanvasConfig(false, {
        fineMinDrawingLength: 180,
        fineMinDrawingPoints: 24,
      })
    ).toEqual({
      minDrawingLength: 180,
      minDrawingPoints: 24,
      minPointDistance: 2,
      strokeStyle: {
        lineWidth: 10,
        shadowBlur: 6,
        shadowColor: 'rgba(15, 23, 42, 0.12)',
        strokeStyle: '#0f172a',
      },
    });

    expect(
      getKangurTracingCanvasConfig(true, {
        fineMinDrawingLength: 180,
        fineMinDrawingPoints: 24,
      })
    ).toEqual({
      minDrawingLength: 120,
      minDrawingPoints: 12,
      minPointDistance: 5,
      strokeStyle: {
        lineWidth: 14,
        shadowBlur: 8,
        shadowColor: 'rgba(15, 23, 42, 0.12)',
        strokeStyle: '#0f172a',
      },
    });
  });

  it('evaluates tracing attempts using shared thresholds', () => {
    expect(
      evaluateKangurTracingAttempt({
        keepGoingText: 'Keep going.',
        minDrawingLength: 180,
        minDrawingPoints: 24,
        pointCount: 10,
        strokeLength: 999,
        successText: 'Done.',
        tooShortText: 'Trace more.',
      })
    ).toEqual({
      kind: 'error',
      text: 'Trace more.',
    });

    expect(
      evaluateKangurTracingAttempt({
        keepGoingText: 'Keep going.',
        minDrawingLength: 180,
        minDrawingPoints: 24,
        pointCount: 30,
        strokeLength: 120,
        successText: 'Done.',
        tooShortText: 'Trace more.',
      })
    ).toEqual({
      kind: 'error',
      text: 'Keep going.',
    });

    expect(
      evaluateKangurTracingAttempt({
        keepGoingText: 'Keep going.',
        minDrawingLength: 180,
        minDrawingPoints: 24,
        pointCount: 30,
        strokeLength: 220,
        successText: 'Done.',
        tooShortText: 'Trace more.',
      })
    ).toEqual({
      kind: 'success',
      text: 'Done.',
    });
  });
});
