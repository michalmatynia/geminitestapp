import { describe, expect, it } from 'vitest';

import {
  IMAGE_STUDIO_LAYOUT_POLICY_CONFIG,
  IMAGE_STUDIO_LAYOUT_POLICY_VERSION,
  decideObjectDetectionCandidate,
} from '@/features/ai/image-studio/analysis/policy';

describe('image-studio detection policy', () => {
  it('exposes bounded runtime policy config', () => {
    expect(IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.autoConfidenceDelta).toBeGreaterThanOrEqual(0);
    expect(IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.autoConfidenceDelta).toBeLessThanOrEqual(0.5);
    expect(IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.whiteAutoAreaRatioBias).toBeGreaterThanOrEqual(0.5);
    expect(IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.whiteAutoAreaRatioBias).toBeLessThanOrEqual(1);
    expect(IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.whiteConfidenceFloor).toBeGreaterThanOrEqual(0);
    expect(IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.whiteConfidenceFloor).toBeLessThanOrEqual(1);
    expect(IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.alphaConfidenceFloor).toBeGreaterThanOrEqual(0);
    expect(IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.alphaConfidenceFloor).toBeLessThanOrEqual(1);
  });

  it('prefers tighter white bounds when confidence is close in auto mode', () => {
    const decision = decideObjectDetectionCandidate({
      requestedDetection: 'auto',
      alphaCandidate: {
        bounds: { left: 0, top: 0, width: 100, height: 100 },
        detectionUsed: 'alpha_bbox',
        confidence: 0.92,
        detectionDetails: null,
      },
      whiteCandidate: {
        bounds: { left: 15, top: 15, width: 70, height: 70 },
        detectionUsed: 'white_bg_first_colored_pixel',
        confidence: 0.91,
        detectionDetails: null,
      },
    });

    expect(decision.policyVersion).toBe(IMAGE_STUDIO_LAYOUT_POLICY_VERSION);
    expect(decision.reason).toBe('auto_white_tighter_bounds');
    expect(decision.fallbackApplied).toBe(false);
    expect(decision.selected?.detectionUsed).toBe('white_bg_first_colored_pixel');
    expect(decision.candidateDetections.alpha_bbox?.area).toBe(10_000);
    expect(decision.candidateDetections.white_bg_first_colored_pixel?.area).toBe(4_900);
  });

  it('falls back to alpha when white confidence is below floor in auto mode', () => {
    const decision = decideObjectDetectionCandidate({
      requestedDetection: 'auto',
      alphaCandidate: {
        bounds: { left: 0, top: 0, width: 100, height: 100 },
        detectionUsed: 'alpha_bbox',
        confidence: 0.76,
        detectionDetails: null,
      },
      whiteCandidate: {
        bounds: { left: 20, top: 20, width: 60, height: 60 },
        detectionUsed: 'white_bg_first_colored_pixel',
        confidence: 0.13,
        detectionDetails: null,
      },
    });

    expect(decision.reason).toBe('auto_white_confidence_below_floor_fallback_alpha');
    expect(decision.fallbackApplied).toBe(true);
    expect(decision.selected?.detectionUsed).toBe('alpha_bbox');
  });

  it('does not fallback when explicit white detection is requested and missing', () => {
    const decision = decideObjectDetectionCandidate({
      requestedDetection: 'white_bg_first_colored_pixel',
      alphaCandidate: {
        bounds: { left: 0, top: 0, width: 100, height: 100 },
        detectionUsed: 'alpha_bbox',
        confidence: 0.87,
        detectionDetails: null,
      },
      whiteCandidate: null,
    });

    expect(decision.reason).toBe('forced_white_no_candidate');
    expect(decision.fallbackApplied).toBe(false);
    expect(decision.selected).toBeNull();
  });
});
