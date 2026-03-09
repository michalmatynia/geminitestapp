import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import { buildImageStudioWorkspaceSystemPrompt } from '../workspace-prompt';

const registryBundle: ContextRegistryResolutionBundle = {
  refs: [
    {
      id: 'runtime:image-studio:workspace',
      kind: 'runtime_document',
      providerId: 'image-studio-page-local',
      entityType: 'image_studio_workspace_state',
    },
  ],
  nodes: [
    {
      id: 'component:image-studio-center-preview',
      kind: 'component',
      name: 'Image Studio Center Preview',
      description: 'Canvas preview surface for mask editing.',
      tags: ['image-studio', 'preview'],
      relationships: [],
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
      title: 'Image Studio workspace for project-alpha',
      summary: 'Workspace state',
      status: 'queued',
      tags: ['image-studio'],
      relatedNodeIds: ['page:admin-image-studio'],
      timestamps: {
        observedAtISO: '2026-03-09T10:00:00.000Z',
      },
      facts: {
        projectName: 'project-alpha',
        activeTab: 'studio',
        selectedSlotId: 'slot-1',
        workingSlotId: 'slot-1',
        previewMode: 'image',
        assignedModelId: 'gpt-image-1',
        promptPreview: 'High-key cosmetic bottle hero shot with translucent shadow.',
        paramKeys: ['lighting', 'background'],
        maskShapeCount: 2,
        maskInvert: false,
        maskFeather: 8,
        activeRunStatus: 'queued',
      },
    },
  ],
  truncated: false,
  engineVersion: 'page-context-engine/1',
};

describe('buildImageStudioWorkspaceSystemPrompt', () => {
  it('returns an empty string when no bundle is available', () => {
    expect(
      buildImageStudioWorkspaceSystemPrompt({
        registryBundle: null,
        taskLabel: 'prompt parameter extraction',
      })
    ).toBe('');
  });

  it('summarizes the current workspace for inline Image Studio AI tools', () => {
    const prompt = buildImageStudioWorkspaceSystemPrompt({
      registryBundle,
      taskLabel: 'prompt parameter extraction',
      extraInstructions: 'Use slot-specific wording when it removes ambiguity.',
    });

    expect(prompt).toContain('Context Registry bundle for the current Image Studio workspace.');
    expect(prompt).toContain('Use it as live operator context for prompt parameter extraction.');
    expect(prompt).toContain('Workspace: project=project-alpha; tab=studio; selectedSlot=slot-1');
    expect(prompt).toContain('Prompt draft: High-key cosmetic bottle hero shot');
    expect(prompt).toContain('Active params: lighting, background.');
    expect(prompt).toContain('Mask state: shapes=2, invert=false, feather=8.');
    expect(prompt).toContain('Relevant UI surfaces: Image Studio Center Preview.');
  });
});
