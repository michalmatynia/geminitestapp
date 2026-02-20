import { describe, expect, it } from 'vitest';

import {
  imageStudioAnalysisResponseSchema,
  imageStudioAnalysisRequestSchema,
  imageStudioAutoScalerResponseSchema,
  imageStudioAutoScalerRequestSchema,
} from '@/shared/contracts/image-studio';

describe('imageStudioAnalysisRequestSchema', () => {
  it('accepts a server analysis payload with layout', () => {
    const parsed = imageStudioAnalysisRequestSchema.safeParse({
      mode: 'server_analysis_v1',
      requestId: 'analysis_request_123456',
      layout: {
        paddingPercent: 12,
        paddingXPercent: 10,
        paddingYPercent: 14,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 1600,
        targetCanvasHeight: 1600,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a client analysis payload with dataUrl', () => {
    const parsed = imageStudioAnalysisRequestSchema.safeParse({
      mode: 'client_analysis_v1',
      dataUrl: 'data:image/png;base64,abc',
      requestId: 'analysis_client_1234',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('imageStudioAutoScalerRequestSchema', () => {
  it('accepts a server auto scaler payload', () => {
    const parsed = imageStudioAutoScalerRequestSchema.safeParse({
      mode: 'server_auto_scaler_v1',
      requestId: 'autoscale_request_1234',
      layout: {
        paddingPercent: 9,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 2048,
        targetCanvasHeight: 2048,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a client auto scaler payload with dataUrl', () => {
    const parsed = imageStudioAutoScalerRequestSchema.safeParse({
      mode: 'client_auto_scaler_v1',
      requestId: 'autoscale_client_1234',
      dataUrl: 'data:image/png;base64,abc',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects unknown auto scaler mode', () => {
    const parsed = imageStudioAutoScalerRequestSchema.safeParse({
      mode: 'server_object_layout_v1',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('analysis/autoscaler response schemas', () => {
  it('accepts an analysis response payload', () => {
    const parsed = imageStudioAnalysisResponseSchema.safeParse({
      sourceSlotId: 'slot-1',
      mode: 'server_analysis_v1',
      effectiveMode: 'server_analysis_v1',
      authoritativeSource: 'source_slot',
      sourceMimeHint: 'image/png',
      analysis: {
        width: 1200,
        height: 1200,
        sourceObjectBounds: { left: 120, top: 100, width: 900, height: 950 },
        detectionUsed: 'white_bg_first_colored_pixel',
        confidence: 0.9475,
        detectionDetails: {
          shadowPolicyRequested: 'auto',
          shadowPolicyApplied: 'exclude_shadow',
          componentCount: 2,
          coreComponentCount: 1,
          selectedComponentPixels: 854000,
          selectedComponentCoverage: 0.9861,
          foregroundPixels: 860120,
          corePixels: 854320,
          touchesBorder: false,
          maskSource: 'core',
          policyVersion: 'v2',
          policyReason: 'auto_white_tighter_bounds',
          fallbackApplied: false,
          candidateDetections: {
            alpha_bbox: { confidence: 0.52, area: 1_440_000 },
            white_bg_first_colored_pixel: { confidence: 0.9475, area: 855000 },
          },
        },
        policyVersion: 'v2',
        policyReason: 'auto_white_tighter_bounds',
        fallbackApplied: false,
        candidateDetections: {
          alpha_bbox: { confidence: 0.52, area: 1_440_000 },
          white_bg_first_colored_pixel: { confidence: 0.9475, area: 855000 },
        },
        whitespace: {
          px: { left: 120, top: 100, right: 180, bottom: 150 },
          percent: { left: 10, top: 8.333, right: 15, bottom: 12.5 },
        },
        objectAreaPercent: 59.375,
        layout: {
          paddingPercent: 8,
          paddingXPercent: 8,
          paddingYPercent: 8,
          fillMissingCanvasWhite: true,
          targetCanvasWidth: 1200,
          targetCanvasHeight: 1200,
          whiteThreshold: 16,
          chromaThreshold: 10,
          shadowPolicy: 'auto',
          detection: 'auto',
        },
        suggestedPlan: {
          outputWidth: 1200,
          outputHeight: 1200,
          targetObjectBounds: { left: 96, top: 96, width: 1008, height: 1008 },
          scale: 1.05,
          whitespace: {
            px: { left: 96, top: 96, right: 96, bottom: 96 },
            percent: { left: 8, top: 8, right: 8, bottom: 8 },
          },
        },
      },
      lifecycle: { state: 'analyzed', durationMs: 42 },
      pipelineVersion: 'v1',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts an autoscaler response payload', () => {
    const parsed = imageStudioAutoScalerResponseSchema.safeParse({
      sourceSlotId: 'slot-1',
      mode: 'server_auto_scaler_v1',
      effectiveMode: 'server_auto_scaler_v1',
      slot: {
        id: 'slot-2',
        createdAt: '2026-02-20T00:00:00.000Z',
        updatedAt: '2026-02-20T00:00:00.000Z',
        projectId: 'project-1',
        name: 'Auto Scaled',
        folderPath: null,
        imageFileId: 'file-2',
      },
      layout: {
        paddingPercent: 9,
        paddingXPercent: 9,
        paddingYPercent: 9,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 2048,
        targetCanvasHeight: 2048,
        whiteThreshold: 16,
        chromaThreshold: 10,
        shadowPolicy: 'auto',
        layoutPolicyVersion: 'v2',
        detectionPolicyDecision: 'auto_white_tighter_bounds',
      },
      detectionUsed: 'white_bg_first_colored_pixel',
      confidenceBefore: 0.9134,
      detectionDetails: {
        shadowPolicyRequested: 'auto',
        shadowPolicyApplied: 'exclude_shadow',
        componentCount: 1,
        coreComponentCount: 1,
        selectedComponentPixels: 1200000,
        selectedComponentCoverage: 0.9942,
        foregroundPixels: 1211200,
        corePixels: 1200040,
        touchesBorder: false,
        maskSource: 'core',
        policyVersion: 'v2',
        policyReason: 'auto_white_tighter_bounds',
        fallbackApplied: false,
        candidateDetections: {
          alpha_bbox: { confidence: 0.52, area: 1_440_000 },
          white_bg_first_colored_pixel: { confidence: 0.9134, area: 1_200_000 },
        },
      },
      scale: 1.24,
      whitespaceBefore: {
        px: { left: 320, top: 200, right: 280, bottom: 220 },
        percent: { left: 15.625, top: 9.766, right: 13.672, bottom: 10.742 },
      },
      whitespaceAfter: {
        px: { left: 184, top: 184, right: 184, bottom: 184 },
        percent: { left: 8.984, top: 8.984, right: 8.984, bottom: 8.984 },
      },
      objectAreaPercentBefore: 52.75,
      objectAreaPercentAfter: 67.24,
      deduplicated: false,
      lifecycle: { state: 'persisted', durationMs: 180 },
      pipelineVersion: 'v1',
    });
    expect(parsed.success).toBe(true);
  });
});
