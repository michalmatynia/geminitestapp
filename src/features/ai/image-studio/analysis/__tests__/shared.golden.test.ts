import { describe, expect, it } from 'vitest';

import {
  OBJECT_LAYOUT_GOLDEN_FIXTURES,
  type ObjectLayoutFixtureVariant,
} from '@/features/ai/image-studio/analysis/__fixtures__/object-layout';
import {
  averageMetric,
  computeBoundsDelta,
  computeBoundsIou,
  minMetric,
} from '@/features/ai/image-studio/analysis/__tests__/bounds-metrics';
import { detectObjectBoundsForLayoutFromRgba } from '@/features/ai/image-studio/analysis/shared';
import type { ImageStudioCenterLayoutConfig } from '@/features/ai/image-studio/contracts/center';

const DETECTION_LAYOUT_BY_VARIANT: Record<
  ObjectLayoutFixtureVariant,
  ImageStudioCenterLayoutConfig
> = {
  auto: {
    detection: 'auto',
    shadowPolicy: 'auto',
  },
  alpha: {
    detection: 'alpha_bbox',
    shadowPolicy: 'auto',
  },
  white_include_shadow: {
    detection: 'white_bg_first_colored_pixel',
    shadowPolicy: 'include_shadow',
  },
  white_exclude_shadow: {
    detection: 'white_bg_first_colored_pixel',
    shadowPolicy: 'exclude_shadow',
  },
};

const runDetectionForVariant = (
  fixture: (typeof OBJECT_LAYOUT_GOLDEN_FIXTURES)[number],
  variant: ObjectLayoutFixtureVariant
) =>
  detectObjectBoundsForLayoutFromRgba(
    fixture.rgba,
    fixture.width,
    fixture.height,
    DETECTION_LAYOUT_BY_VARIANT[variant]
  );

describe('image-studio analysis golden fixtures', () => {
  for (const fixture of OBJECT_LAYOUT_GOLDEN_FIXTURES) {
    for (const variant of Object.keys(fixture.expectations) as ObjectLayoutFixtureVariant[]) {
      const expectation = fixture.expectations[variant];
      if (!expectation) continue;
      it(`${fixture.id}: ${variant} detection remains within quality bounds`, () => {
        const detection = runDetectionForVariant(fixture, variant);
        expect(detection).not.toBeNull();
        if (!detection) return;

        const iou = computeBoundsIou(detection.bounds, expectation.bounds);
        const delta = computeBoundsDelta(detection.bounds, expectation.bounds);
        expect(iou).toBeGreaterThanOrEqual(expectation.minIou);
        expect(delta.max).toBeLessThanOrEqual(expectation.maxEdgeDeltaPx);
        expect(detection.confidence).toBeGreaterThanOrEqual(expectation.minConfidence);
        if (expectation.detectionUsed) {
          expect(detection.detectionUsed).toBe(expectation.detectionUsed);
        }
      });
    }
  }

  it('auto detection baseline metrics stay above KPI floor', () => {
    const cleanIous: number[] = [];
    const challengingIous: number[] = [];
    const confidences: number[] = [];
    let missingDetections = 0;

    for (const fixture of OBJECT_LAYOUT_GOLDEN_FIXTURES) {
      const detection = runDetectionForVariant(fixture, 'auto');
      if (!detection) {
        missingDetections += 1;
        continue;
      }
      const iou = computeBoundsIou(detection.bounds, fixture.groundTruthBounds);
      confidences.push(detection.confidence);
      if (fixture.category === 'clean') {
        cleanIous.push(iou);
      } else {
        challengingIous.push(iou);
      }
    }

    const summary = {
      fixtures: OBJECT_LAYOUT_GOLDEN_FIXTURES.length,
      missingDetections,
      cleanAverageIou: averageMetric(cleanIous),
      challengingAverageIou: averageMetric(challengingIous),
      worstAutoIou: minMetric([...cleanIous, ...challengingIous]),
      minAutoConfidence: minMetric(confidences),
    };

    expect(summary.missingDetections).toBe(0);
    expect(summary.cleanAverageIou).toBeGreaterThanOrEqual(0.9);
    expect(summary.challengingAverageIou).toBeGreaterThanOrEqual(0.8);
    expect(summary.worstAutoIou).toBeGreaterThanOrEqual(0.78);
    expect(summary.minAutoConfidence).toBeGreaterThanOrEqual(0.2);
    expect(summary).toMatchInlineSnapshot(`
      {
        "challengingAverageIou": 1,
        "cleanAverageIou": 1,
        "fixtures": 6,
        "minAutoConfidence": 0.89,
        "missingDetections": 0,
        "worstAutoIou": 1,
      }
    `);
  });
});
