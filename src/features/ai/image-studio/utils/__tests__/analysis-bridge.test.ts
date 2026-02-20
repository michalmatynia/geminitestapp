import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearImageStudioAnalysisApplyIntent,
  loadImageStudioAnalysisApplyIntent,
  loadImageStudioAnalysisPlanSnapshot,
  saveImageStudioAnalysisApplyIntent,
  saveImageStudioAnalysisPlanSnapshot,
} from '@/features/ai/image-studio/utils/analysis-bridge';

describe('analysis bridge utils', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persists and loads normalized analysis plan snapshot', () => {
    saveImageStudioAnalysisPlanSnapshot('Project Alpha', {
      slotId: 'slot_1',
      savedAt: '2026-02-20T20:00:00.000Z',
      layout: {
        paddingPercent: 100,
        paddingXPercent: -5,
        paddingYPercent: 12.456,
        splitAxes: true,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 1024,
        targetCanvasHeight: 1024,
        whiteThreshold: 200,
        chromaThreshold: -20,
        shadowPolicy: 'include_shadow',
        detection: 'white_bg_first_colored_pixel',
      },
      effectiveMode: 'server_analysis_v1',
      authoritativeSource: 'source_slot',
      detectionUsed: 'white_bg_first_colored_pixel',
      confidence: 3.2,
      policyVersion: 'policy_v2',
      policyReason: 'white_confident',
      fallbackApplied: false,
    });

    const loaded = loadImageStudioAnalysisPlanSnapshot('Project Alpha');
    expect(loaded?.slotId).toBe('slot_1');
    expect(loaded?.layout.paddingPercent).toBe(40);
    expect(loaded?.layout.paddingXPercent).toBe(0);
    expect(loaded?.layout.paddingYPercent).toBe(12.46);
    expect(loaded?.layout.whiteThreshold).toBe(80);
    expect(loaded?.layout.chromaThreshold).toBe(0);
    expect(loaded?.confidence).toBe(1);
  });

  it('persists and clears apply intent', () => {
    saveImageStudioAnalysisApplyIntent('Project Alpha', {
      slotId: 'slot_1',
      target: 'object_layout',
      layout: {
        paddingPercent: 8,
        paddingXPercent: 8,
        paddingYPercent: 8,
        splitAxes: false,
        fillMissingCanvasWhite: false,
        targetCanvasWidth: null,
        targetCanvasHeight: null,
        whiteThreshold: 16,
        chromaThreshold: 10,
        shadowPolicy: 'auto',
        detection: 'auto',
      },
    });

    expect(loadImageStudioAnalysisApplyIntent('Project Alpha')?.target).toBe('object_layout');
    clearImageStudioAnalysisApplyIntent('Project Alpha');
    expect(loadImageStudioAnalysisApplyIntent('Project Alpha')).toBeNull();
  });

  it('keeps project scoped snapshot data isolated', () => {
    saveImageStudioAnalysisPlanSnapshot('Project One', {
      slotId: 'slot_a',
      savedAt: '2026-02-20T20:00:00.000Z',
      layout: {
        paddingPercent: 8,
        paddingXPercent: 8,
        paddingYPercent: 8,
        splitAxes: false,
        fillMissingCanvasWhite: false,
        targetCanvasWidth: null,
        targetCanvasHeight: null,
        whiteThreshold: 16,
        chromaThreshold: 10,
        shadowPolicy: 'auto',
        detection: 'auto',
      },
      effectiveMode: 'server_analysis_v1',
      authoritativeSource: 'source_slot',
      detectionUsed: 'alpha_bbox',
      confidence: 0.92,
      policyVersion: 'policy_v2',
      policyReason: 'alpha_confident',
      fallbackApplied: false,
    });
    saveImageStudioAnalysisPlanSnapshot('Project Two', {
      slotId: 'slot_b',
      savedAt: '2026-02-20T20:00:00.000Z',
      layout: {
        paddingPercent: 8,
        paddingXPercent: 8,
        paddingYPercent: 8,
        splitAxes: false,
        fillMissingCanvasWhite: false,
        targetCanvasWidth: null,
        targetCanvasHeight: null,
        whiteThreshold: 16,
        chromaThreshold: 10,
        shadowPolicy: 'auto',
        detection: 'auto',
      },
      effectiveMode: 'server_analysis_v1',
      authoritativeSource: 'source_slot',
      detectionUsed: 'white_bg_first_colored_pixel',
      confidence: 0.88,
      policyVersion: 'policy_v2',
      policyReason: 'white_confident',
      fallbackApplied: false,
    });

    expect(loadImageStudioAnalysisPlanSnapshot('Project One')?.slotId).toBe('slot_a');
    expect(loadImageStudioAnalysisPlanSnapshot('Project Two')?.slotId).toBe('slot_b');
  });
});
