import { describe, expect, it } from 'vitest';

import type {
  ImageStudioProjectRecord,
  ImageStudioSlotRecord,
} from '@/shared/contracts/image-studio';
import { defaultImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';

import {
  buildImageStudioWorkspaceContextBundle,
  IMAGE_STUDIO_CONTEXT_ROOT_IDS,
  IMAGE_STUDIO_CONTEXT_RUNTIME_REF,
} from '../workspace';

const projects: ImageStudioProjectRecord[] = [
  {
    id: 'project-a',
    name: 'Campaign Alpha',
    canvasWidthPx: 1024,
    canvasHeightPx: 1024,
    createdAt: '2026-03-09T09:00:00.000Z',
    updatedAt: '2026-03-09T09:00:00.000Z',
  },
];

const slots: ImageStudioSlotRecord[] = [
  {
    id: 'slot-1',
    projectId: 'project-a',
    name: 'Hero shot',
    folderPath: 'hero',
    imageUrl: '/uploads/image-studio/project-a/slot-1.png',
    width: 1024,
    height: 1024,
    metadata: { role: 'generation' },
    createdAt: '2026-03-09T09:00:00.000Z',
    updatedAt: '2026-03-09T09:00:00.000Z',
  } as ImageStudioSlotRecord,
];

describe('buildImageStudioWorkspaceContextBundle', () => {
  it('builds a runtime document from the current Image Studio workspace state', () => {
    const bundle = buildImageStudioWorkspaceContextBundle({
      activeTab: 'studio',
      projectId: 'project-a',
      projects,
      slots,
      selectedSlot: slots[0] ?? null,
      workingSlot: slots[0] ?? null,
      selectedFolder: 'hero',
      previewMode: 'image',
      promptText: 'Studio portrait with bright rim lighting and soft shadow.',
      paramsState: { lens: '85mm', mood: 'clean' },
      studioSettings: {
        ...defaultImageStudioSettings,
        targetAi: {
          ...defaultImageStudioSettings.targetAi,
          openai: {
            ...defaultImageStudioSettings.targetAi.openai,
            image: {
              ...defaultImageStudioSettings.targetAi.openai.image,
              n: 2,
              size: '1536x1024',
              quality: 'high',
              background: 'transparent',
            },
          },
        },
      },
      isFocusMode: true,
      previewCanvasSize: 'xlarge',
      maskShapes: [
        {
          type: 'polygon',
          visible: true,
          closed: true,
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.8, y: 0.1 },
            { x: 0.5, y: 0.9 },
          ],
        },
      ],
      maskInvert: true,
      maskFeather: 12,
      activeRunId: 'run-1',
      activeRunStatus: 'queued',
      activeRunError: null,
      landingSlots: [
        {
          index: 1,
          status: 'pending',
          output: null,
        },
      ],
      generationHistoryCount: 3,
      assignedModelId: 'gpt-image-1',
    });

    expect(bundle.refs).toEqual([IMAGE_STUDIO_CONTEXT_RUNTIME_REF]);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]?.relatedNodeIds).toEqual([...IMAGE_STUDIO_CONTEXT_ROOT_IDS]);
    expect(bundle.documents[0]?.facts).toMatchObject({
      activeTab: 'studio',
      projectId: 'project-a',
      projectName: 'Campaign Alpha',
      selectedFolder: 'hero',
      selectedSlotId: 'slot-1',
      workingSlotId: 'slot-1',
      previewMode: 'image',
      previewCanvasSize: 'xlarge',
      isFocusMode: true,
      assignedModelId: 'gpt-image-1',
      maskShapeCount: 1,
      eligibleMaskShapeCount: 1,
      maskInvert: true,
      maskFeather: 12,
      activeRunId: 'run-1',
      activeRunStatus: 'queued',
      generationHistoryCount: 3,
      requestedOutputCount: 2,
      requestedSize: '1536x1024',
      requestedQuality: 'high',
      requestedBackground: 'transparent',
    });
    expect(bundle.documents[0]?.sections[0]?.title).toBe('Workspace snapshot');
    expect(bundle.documents[0]?.sections[1]?.items?.[0]).toMatchObject({
      outputCount: 2,
      quality: 'high',
      size: '1536x1024',
    });
    expect(bundle.documents[0]?.sections[3]?.items?.[0]).toMatchObject({
      id: 'project-a',
      isActive: true,
    });
  });
});
