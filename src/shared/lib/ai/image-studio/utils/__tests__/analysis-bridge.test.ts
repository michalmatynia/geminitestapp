import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildImageStudioAnalysisSourceSignature,
  clearImageStudioAnalysisApplyIntent,
  loadImageStudioAnalysisApplyIntent,
  loadImageStudioAnalysisPlanSnapshot,
  saveImageStudioAnalysisApplyIntent,
  saveImageStudioAnalysisPlanSnapshot,
} from '@/shared/lib/ai/image-studio/utils/analysis-bridge';

describe('analysis bridge utils', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persists and loads normalized analysis plan snapshot', () => {
    saveImageStudioAnalysisPlanSnapshot('Project Alpha', {
      slotId: 'slot_1',
      sourceSignature: 'signature_slot_1_v1',
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
    expect(loaded?.sourceSignature).toBe('signature_slot_1_v1');
  });

  it('persists and clears apply intent', () => {
    saveImageStudioAnalysisApplyIntent('Project Alpha', {
      slotId: 'slot_1',
      sourceSignature: 'signature_slot_1_v1',
      runAfterApply: true,
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
    expect(loadImageStudioAnalysisApplyIntent('Project Alpha')?.runAfterApply).toBe(true);
    clearImageStudioAnalysisApplyIntent('Project Alpha');
    expect(loadImageStudioAnalysisApplyIntent('Project Alpha')).toBeNull();
  });

  it('keeps project scoped snapshot data isolated', () => {
    saveImageStudioAnalysisPlanSnapshot('Project One', {
      slotId: 'slot_a',
      sourceSignature: 'signature_slot_a_v1',
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
      sourceSignature: 'signature_slot_b_v1',
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

  it('builds deterministic source signatures from slot metadata', () => {
    const signatureA = buildImageStudioAnalysisSourceSignature({
      slotId: 'slot_1',
      imageFileId: 'file_1',
      imageFile: {
        id: 'file_1',
        updatedAt: '2026-02-20T20:00:00.000Z',
        size: 64000,
        width: 1200,
        height: 1200,
        filepath: '/assets/source-1.png',
        filename: 'source-1.png',
        mimetype: 'image/png',
      },
      imageUrl: '/assets/source-1.png',
      imageBase64: '',
      resolvedImageSrc: '/assets/source-1.png',
      clientProcessingImageSrc: '/assets/source-1.png',
    });
    const signatureB = buildImageStudioAnalysisSourceSignature({
      slotId: 'slot_1',
      imageFileId: 'file_1',
      imageFile: {
        id: 'file_1',
        updatedAt: '2026-02-20T20:00:00.000Z',
        size: 64000,
        width: 1200,
        height: 1200,
        filepath: '/assets/source-1.png',
        filename: 'source-1.png',
        mimetype: 'image/png',
      },
      imageUrl: '/assets/source-1.png',
      imageBase64: '',
      resolvedImageSrc: '/assets/source-1.png',
      clientProcessingImageSrc: '/assets/source-1.png',
    });
    const signatureC = buildImageStudioAnalysisSourceSignature({
      slotId: 'slot_1',
      imageFileId: 'file_2',
      imageFile: {
        id: 'file_2',
        updatedAt: '2026-02-21T20:00:00.000Z',
        size: 64000,
        width: 1200,
        height: 1200,
        filepath: '/assets/source-2.png',
        filename: 'source-2.png',
        mimetype: 'image/png',
      },
      imageUrl: '/assets/source-2.png',
      imageBase64: '',
      resolvedImageSrc: '/assets/source-2.png',
      clientProcessingImageSrc: '/assets/source-2.png',
    });

    expect(signatureA).toBe(signatureB);
    expect(signatureA).not.toBe(signatureC);
  });

  it('loads legacy snapshots without source signature for rerun gating', () => {
    window.sessionStorage.setItem(
      'image_studio_analysis_plan_snapshot_session',
      JSON.stringify({
        version: 1,
        slotId: 'legacy_slot',
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
        confidence: 0.9,
        policyVersion: 'policy_v2',
        policyReason: 'alpha_confident',
        fallbackApplied: false,
      })
    );

    const loaded = loadImageStudioAnalysisPlanSnapshot(null);
    expect(loaded?.slotId).toBe('legacy_slot');
    expect(loaded?.sourceSignature).toBe('');
  });

  it('loads legacy apply intents without runAfterApply as false', () => {
    window.sessionStorage.setItem(
      'image_studio_analysis_apply_intent_session',
      JSON.stringify({
        version: 1,
        slotId: 'legacy_slot',
        sourceSignature: 'legacy_signature',
        createdAt: '2026-02-20T20:00:00.000Z',
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
      })
    );

    const loaded = loadImageStudioAnalysisApplyIntent(null);
    expect(loaded?.slotId).toBe('legacy_slot');
    expect(loaded?.runAfterApply).toBe(false);
  });
});
