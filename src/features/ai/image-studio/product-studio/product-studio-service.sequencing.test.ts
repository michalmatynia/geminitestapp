import { describe, expect, it } from 'vitest';

import { resolvePostProductionRoute } from './product-studio-service.sequencing';
import type { ProductStudioSequencingConfig } from '@/shared/contracts/products';

const makeSequencing = (
  overrides: Partial<ProductStudioSequencingConfig> = {}
): ProductStudioSequencingConfig => ({
  persistedEnabled: false,
  enabled: false,
  cropCenterBeforeGeneration: false,
  upscaleOnAccept: false,
  upscaleScale: 1,
  runViaSequence: false,
  sequenceStepCount: 0,
  expectedOutputs: 0,
  snapshotHash: null,
  snapshotSavedAt: null,
  snapshotStepCount: 0,
  snapshotModelId: null,
  currentSnapshotHash: null,
  snapshotMatchesCurrent: false,
  needsSaveDefaults: false,
  needsSaveDefaultsReason: null,
  ...overrides,
});

describe('resolvePostProductionRoute', () => {
  it('keeps explicit studio sequencer mode unchanged', () => {
    expect(
      resolvePostProductionRoute({
        sequencing: makeSequencing(),
        requestedMode: 'studio_prompt_then_sequence',
        modelId: 'gpt-image-1',
      })
    ).toEqual({
      executionRoute: 'studio_sequencer',
      runKind: 'sequence',
      resolvedMode: 'studio_prompt_then_sequence',
      warnings: [],
    });
  });

  it('forces studio sequencer when strict sequencing is enabled for the project', () => {
    expect(
      resolvePostProductionRoute({
        sequencing: makeSequencing({
          enabled: true,
          runViaSequence: true,
          sequenceStepCount: 3,
        }),
        requestedMode: 'model_full_sequence',
        modelId: 'gpt-5.2',
      })
    ).toEqual({
      executionRoute: 'studio_sequencer',
      runKind: 'sequence',
      resolvedMode: 'studio_prompt_then_sequence',
      warnings: [
        'Project sequencing is enabled, so Product Studio runs the Image Studio sequence exactly as configured.',
      ],
    });
  });

  it('prefers full-sequence generation for auto mode when the model supports it', () => {
    expect(
      resolvePostProductionRoute({
        sequencing: makeSequencing(),
        requestedMode: 'auto',
        modelId: 'gpt-image-1',
      })
    ).toEqual({
      executionRoute: 'ai_model_full_sequence',
      runKind: 'generation',
      resolvedMode: 'model_full_sequence',
      warnings: [],
    });
  });

  it('falls back to direct generation when full-sequence generation is unsupported and project sequencing is disabled', () => {
    expect(
      resolvePostProductionRoute({
        sequencing: makeSequencing({
          sequenceStepCount: 2,
        }),
        requestedMode: 'model_full_sequence',
        modelId: 'dall-e-3',
      })
    ).toEqual({
      executionRoute: 'ai_direct_generation',
      runKind: 'generation',
      resolvedMode: 'model_full_sequence',
      warnings: [
        'Model "dall-e-3" does not support full-sequence generation and persisted project sequencing is disabled, so Product Studio will run direct generation only.',
      ],
    });
  });
});
