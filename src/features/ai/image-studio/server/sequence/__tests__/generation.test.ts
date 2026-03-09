import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type {
  ImageStudioSequenceRunRecord,
  ImageStudioSlotRecord,
} from '@/shared/contracts/image-studio';

const {
  createImageStudioRunMock,
  getImageStudioRunByIdMock,
  listImageStudioSlotsMock,
  enqueueImageStudioRunJobMock,
} = vi.hoisted(() => ({
  createImageStudioRunMock: vi.fn(),
  getImageStudioRunByIdMock: vi.fn(),
  listImageStudioSlotsMock: vi.fn(),
  enqueueImageStudioRunJobMock: vi.fn(),
}));

vi.mock('@/features/ai/image-studio/server', () => ({
  createImageStudioRun: createImageStudioRunMock,
  getImageStudioRunById: getImageStudioRunByIdMock,
  listImageStudioSlots: listImageStudioSlotsMock,
}));

vi.mock('@/features/ai/image-studio/workers/imageStudioRunQueue', () => ({
  enqueueImageStudioRunJob: enqueueImageStudioRunJobMock,
}));

import { executeGenerateStep } from '../generation';

const contextRegistry: ContextRegistryConsumerEnvelope = {
  refs: [
    {
      id: 'runtime:image-studio:workspace',
      kind: 'runtime_document',
      providerId: 'image-studio-page-local',
      entityType: 'image_studio_workspace_state',
    },
  ],
  engineVersion: 'page-context-engine/1',
  resolved: {
    refs: [
      {
        id: 'runtime:image-studio:workspace',
        kind: 'runtime_document',
        providerId: 'image-studio-page-local',
        entityType: 'image_studio_workspace_state',
      },
    ],
    nodes: [],
    documents: [],
    truncated: false,
    engineVersion: 'page-context-engine/1',
  },
};

const run = {
  id: 'sequence-run-1',
  projectId: 'project-1',
  sourceSlotId: 'slot-source',
  currentSlotId: 'slot-source',
  status: 'running',
  dispatchMode: 'queued',
  request: {
    projectId: 'project-1',
    sourceSlotId: 'slot-source',
    prompt: 'Original sequence prompt',
    paramsState: null,
    referenceSlotIds: [],
    steps: [],
    mask: null,
    studioSettings: null,
    metadata: null,
    contextRegistry,
  },
  activeStepIndex: 0,
  activeStepId: 'step-generate',
  outputSlotIds: [],
  runtimeMask: null,
  cancelRequested: false,
  errorMessage: null,
  createdAt: '2026-03-09T08:00:00.000Z',
  updatedAt: '2026-03-09T08:00:00.000Z',
  startedAt: '2026-03-09T08:00:00.000Z',
  finishedAt: null,
  historyEvents: [],
} satisfies ImageStudioSequenceRunRecord;

const currentSlot = {
  id: 'slot-source',
  projectId: 'project-1',
  name: 'Source Slot',
  createdAt: '2026-03-09T08:00:00.000Z',
  updatedAt: '2026-03-09T08:00:00.000Z',
} as ImageStudioSlotRecord;

describe('executeGenerateStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createImageStudioRunMock.mockResolvedValue({
      id: 'generated-run-1',
    });
    getImageStudioRunByIdMock.mockResolvedValue({
      id: 'generated-run-1',
      status: 'completed',
      errorMessage: null,
    });
    listImageStudioSlotsMock.mockResolvedValue([
      {
        id: 'slot-output-1',
        projectId: 'project-1',
        metadata: {
          generationRunId: 'generated-run-1',
        },
      },
    ]);
    enqueueImageStudioRunJobMock.mockResolvedValue(undefined);
  });

  it('propagates the stored page context registry to nested generation runs', async () => {
    const result = await executeGenerateStep({
      run,
      step: {
        id: 'step-generate',
        type: 'generate',
        enabled: true,
        runtime: 'server',
        inputSource: 'previous_output',
        label: 'Generate variant',
        config: {
          promptTemplate: 'Create {{slotId}} variant',
          outputCount: 1,
        },
      },
      currentSlot,
      _runtimeMask: null,
    });

    expect(createImageStudioRunMock).toHaveBeenCalledWith({
      projectId: 'project-1',
      request: expect.objectContaining({
        projectId: 'project-1',
        prompt: 'Create slot-source variant',
        contextRegistry,
      }),
      expectedOutputs: 1,
    });
    expect(result).toMatchObject({
      nextSlotId: 'slot-output-1',
      producedSlotIds: ['slot-output-1'],
      generatedRunId: 'generated-run-1',
    });
  });
});
