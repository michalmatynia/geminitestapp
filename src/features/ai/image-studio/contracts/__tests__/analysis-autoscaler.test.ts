import { describe, expect, it } from 'vitest';

import {
  imageStudioAnalysisRequestSchema,
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
