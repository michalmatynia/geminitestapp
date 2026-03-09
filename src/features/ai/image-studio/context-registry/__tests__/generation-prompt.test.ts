import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import { buildImageStudioGenerationPrompt } from '../generation-prompt';

describe('buildImageStudioGenerationPrompt', () => {
  it('injects concise Image Studio workspace context ahead of the creative brief', () => {
    const bundle: ContextRegistryResolutionBundle = {
      refs: [{ id: 'page:admin-image-studio', kind: 'static_node' }],
      nodes: [
        {
          id: 'component:image-studio-center-preview',
          kind: 'component',
          name: 'ImageStudioCenterPreview',
          description: 'Preview canvas',
          tags: ['image-studio', 'preview'],
          relationships: [{ type: 'uses', targetId: 'action:image-studio-run' }],
          permissions: {
            readScopes: ['ctx:read'],
            riskTier: 'none',
            classification: 'internal',
          },
          version: '1.0.0',
          updatedAtISO: '2026-03-09T00:00:00.000Z',
          source: { type: 'code', ref: 'test' },
        },
      ],
      documents: [
        {
          id: 'runtime:image-studio:workspace',
          kind: 'runtime_document',
          entityType: 'image_studio_workspace_state',
          title: 'Image Studio workspace state',
          summary: 'Live state',
          status: 'queued',
          tags: ['image-studio', 'admin'],
          relatedNodeIds: ['page:admin-image-studio'],
          facts: {
            projectName: 'Campaign Alpha',
            activeTab: 'studio',
            selectedSlotId: 'slot-1',
            workingSlotId: 'slot-1',
            previewMode: 'image',
            requestedSize: '1536x1024',
            requestedQuality: 'high',
            requestedBackground: 'transparent',
            assignedModelId: 'gpt-image-1',
            promptPreview: 'Studio portrait with bright rim lighting.',
            paramKeys: ['lens', 'mood'],
            maskShapeCount: 1,
            maskInvert: false,
            maskFeather: 8,
            activeRunStatus: 'queued',
          },
          sections: [
            {
              kind: 'facts',
              title: 'Workspace snapshot',
              items: [{ projectName: 'Campaign Alpha' }],
            },
          ],
          provenance: { source: 'test' },
        },
      ],
      truncated: false,
      engineVersion: 'registry:test',
    };

    const prompt = buildImageStudioGenerationPrompt(
      'Create a clean ecommerce hero image with subtle reflections.',
      bundle
    );

    expect(prompt).toContain('Image Studio workspace context:');
    expect(prompt).toContain('project=Campaign Alpha');
    expect(prompt).toContain('Current prompt draft: Studio portrait with bright rim lighting.');
    expect(prompt).toContain('Active prompt params: lens, mood.');
    expect(prompt).toContain('Relevant UI surfaces: ImageStudioCenterPreview.');
    expect(prompt).toContain(
      'Primary creative brief: Create a clean ecommerce hero image with subtle reflections.'
    );
  });

  it('returns the original prompt when no registry context is present', () => {
    expect(buildImageStudioGenerationPrompt('  Make it brighter.  ', null)).toBe(
      'Make it brighter.'
    );
  });
});
