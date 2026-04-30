import { describe, expect, it } from 'vitest';

import {
  resolvePostProductionRoute,
  resolveSequenceReadiness,
} from './product-studio-service.sequencing';
import type {
  ProductStudioSequencingConfig,
  ProductStudioSequencingDiagnostics,
} from '@/shared/contracts/products/studio';

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

const makeDiagnostics = (
  overrides: Partial<ProductStudioSequencingDiagnostics> = {}
): ProductStudioSequencingDiagnostics => ({
  projectId: 'studio-a',
  projectSettingsKey: 'image-studio:project:studio-a:settings',
  selectedSettingsKey: 'image-studio:project:studio-a:settings',
  selectedScope: 'project',
  hasProjectSettings: true,
  hasGlobalSettings: false,
  projectSequencingEnabled: false,
  globalSequencingEnabled: false,
  selectedSequencingEnabled: false,
  selectedSnapshotHash: null,
  selectedSnapshotSavedAt: null,
  selectedSnapshotStepCount: 0,
  selectedSnapshotModelId: null,
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

describe('resolveSequenceReadiness', () => {
  it('marks direct generation routes ready because they do not require project sequencing', () => {
    expect(
      resolveSequenceReadiness({
        sequencing: makeSequencing(),
        sequencingDiagnostics: makeDiagnostics(),
        requestedMode: 'auto',
        route: 'ai_direct_generation',
      })
    ).toEqual({
      ready: true,
      requiresProjectSequence: false,
      state: 'ready',
      message: null,
    });
  });

  it('keeps explicit sequence routes blocked until project sequencing is enabled', () => {
    expect(
      resolveSequenceReadiness({
        sequencing: makeSequencing(),
        sequencingDiagnostics: makeDiagnostics(),
        requestedMode: 'studio_prompt_then_sequence',
        route: 'studio_sequencer',
      })
    ).toMatchObject({
      ready: false,
      requiresProjectSequence: true,
      state: 'project_sequence_disabled',
    });
  });
});
