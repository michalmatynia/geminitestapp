import { describe, expect, it, vi } from 'vitest';

import { handleBoundsNormalizer } from '@/shared/lib/ai-paths/core/runtime/handlers/transform';
import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const buildNode = (boundsNormalizer: Record<string, unknown>): AiNode =>
  ({
    id: 'bounds-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'bounds_normalizer',
    title: 'Bounds Normaliser',
    description: '',
    position: { x: 120, y: 80 },
    data: {},
    inputs: ['value', 'context'],
    outputs: ['value'],
    config: {
      boundsNormalizer,
    },
  }) as AiNode;

const buildContext = (
  overrides: Partial<NodeHandlerContext> = {},
  boundsNormalizer: Record<string, unknown> = { inputFormat: 'pixels_tlwh' }
): NodeHandlerContext =>
  ({
    node: buildNode(boundsNormalizer),
    nodeInputs: {},
    prevOutputs: {},
    edges: [],
    nodes: [],
    nodeById: new Map(),
    runId: 'run-bounds',
    runStartedAt: '2026-01-01T00:00:00.000Z',
    activePathId: null,
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: null,
    deferPoll: false,
    skipAiJobs: false,
    now: '2026-01-01T00:00:00.000Z',
    abortSignal: undefined,
    allOutputs: {},
    allInputs: {},
    fetchEntityCached: vi.fn().mockResolvedValue(null),
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    executed: {
      notification: new Set(),
      updater: new Set(),
      http: new Set(),
      delay: new Set(),
      poll: new Set(),
      ai: new Set(),
      schema: new Set(),
      mapper: new Set(),
    },
    ...overrides,
  }) as NodeHandlerContext;

describe('handleBoundsNormalizer', () => {
  it('normalizes pixels_tlwh with custom field names, boundsPath, confidence, and label', () => {
    const ctx = buildContext(
      {
        nodeInputs: {
          value: {
            box: { x: 10, y: 20, w: 30, h: 40 },
            meta: { score: '0.8', label: ' Lamp ' },
          },
        },
      },
      {
        inputFormat: 'pixels_tlwh',
        boundsPath: 'box',
        leftField: 'x',
        topField: 'y',
        widthField: 'w',
        heightField: 'h',
        confidencePath: 'meta.score',
        labelPath: 'meta.label',
      }
    );

    expect(handleBoundsNormalizer(ctx)).toEqual({
      value: {
        left: 10,
        top: 20,
        width: 30,
        height: 40,
        confidence: 0.8,
        label: 'Lamp',
      },
    });
  });

  it('returns an empty result and toasts when tlwh bounds are invalid', () => {
    const ctx = buildContext(
      {
        nodeInputs: {
          value: { left: 10, top: 20, width: 0, height: 40 },
        },
      },
      { inputFormat: 'pixels_tlwh' }
    );

    expect(handleBoundsNormalizer(ctx)).toEqual({});
    expect(ctx.toast).toHaveBeenCalledWith(
      'Bounds Normaliser "Bounds Normaliser": could not extract bounds from input using format "pixels_tlwh".',
      { variant: 'info' }
    );
  });

  it('normalizes pixels_tlbr inputs into tlwh output', () => {
    const ctx = buildContext(
      {
        nodeInputs: {
          value: { x1: 5, y1: 10, x2: 35, y2: 50 },
        },
      },
      { inputFormat: 'pixels_tlbr' }
    );

    expect(handleBoundsNormalizer(ctx)).toEqual({
      value: {
        left: 5,
        top: 10,
        width: 30,
        height: 40,
        confidence: null,
        label: null,
      },
    });
  });

  it('normalizes gemini_millirelative arrays using nested image dimension paths', () => {
    const ctx = buildContext(
      {
        nodeInputs: {
          value: [[100, 200, 400, 600]],
          context: {
            image: {
              size: { width: 1000, height: 500 },
            },
          },
        },
      },
      {
        inputFormat: 'gemini_millirelative',
        imageWidthPath: 'image.size.width',
        imageHeightPath: 'image.size.height',
      }
    );

    expect(handleBoundsNormalizer(ctx)).toEqual({
      value: {
        left: 200,
        top: 50,
        width: 400,
        height: 150,
        confidence: null,
        label: null,
      },
    });
  });

  it('toasts when relative_xywh format is missing image dimensions', () => {
    const ctx = buildContext(
      {
        nodeInputs: {
          value: [[0.5, 0.5, 0.2, 0.4]],
        },
      },
      { inputFormat: 'relative_xywh' }
    );

    expect(handleBoundsNormalizer(ctx)).toEqual({});
    expect(ctx.toast).toHaveBeenCalledWith(
      'Bounds Normaliser "Bounds Normaliser": image dimensions not available for relative_xywh format.',
      { variant: 'info' }
    );
    expect(ctx.toast).toHaveBeenCalledWith(
      'Bounds Normaliser "Bounds Normaliser": could not extract bounds from input using format "relative_xywh".',
      { variant: 'info' }
    );
  });

  it('normalizes relative_xywh objects and percentage_tlwh objects when dimensions exist', () => {
    const relativeCtx = buildContext(
      {
        nodeInputs: {
          value: { centerX: 0.5, centerY: 0.25, width: 0.2, height: 0.4 },
          context: { imageWidth: 200, imageHeight: 100 },
        },
      },
      { inputFormat: 'relative_xywh' }
    );

    expect(handleBoundsNormalizer(relativeCtx)).toEqual({
      value: {
        left: 80,
        top: 5,
        width: 40,
        height: 40,
        confidence: null,
        label: null,
      },
    });

    const percentageCtx = buildContext(
      {
        nodeInputs: {
          value: { left: 10, top: 20, width: 25, height: 50 },
          context: { imageWidth: 400, imageHeight: 200 },
        },
      },
      { inputFormat: 'percentage_tlwh' }
    );

    expect(handleBoundsNormalizer(percentageCtx)).toEqual({
      value: {
        left: 40,
        top: 40,
        width: 100,
        height: 100,
        confidence: null,
        label: null,
      },
    });
  });

  it('auto-detects tlbr objects, tlwh objects, and normalized arrays', () => {
    const tlbrCtx = buildContext(
      {
        nodeInputs: {
          value: { x1: 2, y1: 4, x2: 12, y2: 24 },
          context: { imageWidth: 200, imageHeight: 100 },
        },
      },
      { inputFormat: 'auto' }
    );

    expect(handleBoundsNormalizer(tlbrCtx)).toEqual({
      value: {
        left: 2,
        top: 4,
        width: 10,
        height: 20,
        confidence: null,
        label: null,
      },
    });

    const tlwhCtx = buildContext(
      {
        nodeInputs: {
          value: { left: 3, top: 6, width: 9, height: 12 },
        },
      },
      { inputFormat: 'auto' }
    );

    expect(handleBoundsNormalizer(tlwhCtx)).toEqual({
      value: {
        left: 3,
        top: 6,
        width: 9,
        height: 12,
        confidence: null,
        label: null,
      },
    });

    const relativeArrayCtx = buildContext(
      {
        nodeInputs: {
          value: [[0.5, 0.5, 0.2, 0.4]],
          context: { imageWidth: 200, imageHeight: 100 },
        },
      },
      { inputFormat: 'auto' }
    );

    expect(handleBoundsNormalizer(relativeArrayCtx)).toEqual({
      value: {
        left: 80,
        top: 30,
        width: 40,
        height: 40,
        confidence: null,
        label: null,
      },
    });
  });
});
