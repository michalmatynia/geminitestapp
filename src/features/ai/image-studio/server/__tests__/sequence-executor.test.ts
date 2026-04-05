import { describe, expect, it } from 'vitest';

import { resolveSequenceStepsForExecution } from '@/features/ai/image-studio/server/sequence-executor';
import { defaultImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';
import type { ImageStudioSequenceRunRecord } from '@/shared/contracts/image-studio/image-studio/sequence';

const makeRun = (
  overrides: Partial<ImageStudioSequenceRunRecord> = {}
): ImageStudioSequenceRunRecord => ({
  id: overrides.id ?? 'run-1',
  projectId: overrides.projectId ?? 'proj-1',
  sourceSlotId: overrides.sourceSlotId ?? 'slot-source',
  currentSlotId: overrides.currentSlotId ?? 'slot-source',
  status: overrides.status ?? 'queued',
  dispatchMode: overrides.dispatchMode ?? 'inline',
  request: overrides.request ?? {
    projectId: 'proj-1',
    sourceSlotId: 'slot-source',
    prompt: 'Generate product variant',
    paramsState: null,
    referenceSlotIds: [],
    steps: [],
    mask: null,
    studioSettings: defaultImageStudioSettings,
    metadata: null,
  },
  activeStepIndex: overrides.activeStepIndex ?? null,
  activeStepId: overrides.activeStepId ?? null,
  outputSlotIds: overrides.outputSlotIds ?? [],
  runtimeMask: overrides.runtimeMask ?? null,
  cancelRequested: overrides.cancelRequested ?? false,
  errorMessage: overrides.errorMessage ?? null,
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  startedAt: overrides.startedAt ?? null,
  finishedAt: overrides.finishedAt ?? null,
  historyEvents: overrides.historyEvents ?? [],
});

describe('resolveSequenceStepsForExecution', () => {
  it('ignores malformed persisted steps instead of crashing', () => {
    const run = makeRun({
      request: {
        projectId: 'proj-1',
        sourceSlotId: 'slot-source',
        prompt: 'Generate product variant',
        paramsState: null,
        referenceSlotIds: [],
        steps: [
          null,
          { type: 'generate', id: 'step-generate' },
          42,
          { type: 'upscale', id: 'step-upscale' },
        ],
        mask: null,
        studioSettings: defaultImageStudioSettings,
        metadata: null,
      },
    });

    const resolvedSteps = resolveSequenceStepsForExecution(run);

    expect(resolvedSteps.map((step) => step.type)).toEqual(['generate', 'upscale']);
  });
});
