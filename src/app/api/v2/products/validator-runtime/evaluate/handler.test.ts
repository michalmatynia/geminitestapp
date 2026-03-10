import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products';

const {
  listValidationPatternsCachedMock,
  resolveBrainExecutionConfigForCapabilityMock,
  runBrainChatCompletionMock,
  resolveProductEditorContextRegistryEnvelopeMock,
} = vi.hoisted(() => ({
  listValidationPatternsCachedMock: vi.fn(),
  resolveBrainExecutionConfigForCapabilityMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  resolveProductEditorContextRegistryEnvelopeMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/validation-pattern-runtime-cache', () => ({
  listValidationPatternsCached: listValidationPatternsCachedMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: resolveBrainExecutionConfigForCapabilityMock,
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: runBrainChatCompletionMock,
  supportsBrainJsonMode: vi.fn(() => true),
}));

vi.mock('@/features/products/context-registry/server', () => ({
  resolveProductEditorContextRegistryEnvelope: resolveProductEditorContextRegistryEnvelopeMock,
}));

const createRuntimePattern = (): ProductValidationPattern =>
  ({
    id: 'pattern-runtime-1',
    label: 'AI validation',
    target: 'name',
    locale: 'en',
    regex: '.*',
    flags: null,
    message: 'Validation failed.',
    severity: 'warning',
    enabled: true,
    replacementEnabled: false,
    replacementAutoApply: false,
    skipNoopReplacementProposal: true,
    replacementValue: null,
    replacementFields: [],
    replacementAppliesToScopes: ['product_edit'],
    runtimeEnabled: true,
    runtimeType: 'ai_prompt',
    runtimeConfig: JSON.stringify({
      version: 1,
      responseFormat: 'json',
      systemPrompt: 'Validate the product field.',
      promptTemplate: 'Check [fieldName] = [fieldValue]',
    }),
    postAcceptBehavior: 'revalidate',
    denyBehaviorOverride: null,
    validationDebounceMs: 0,
    sequenceGroupId: null,
    sequenceGroupLabel: null,
    sequenceGroupDebounceMs: 0,
    sequence: null,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: false,
    launchEnabled: false,
    launchAppliesToScopes: ['product_edit'],
    launchScopeBehavior: 'gate',
    launchSourceMode: 'current_field',
    launchSourceField: null,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
    appliesToScopes: ['product_edit'],
  }) as ProductValidationPattern;

describe('product validator runtime handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listValidationPatternsCachedMock.mockResolvedValue([createRuntimePattern()]);
    resolveProductEditorContextRegistryEnvelopeMock.mockResolvedValue({
      refs: [
        { id: 'page:product-editor', kind: 'static_node' },
        {
          id: 'runtime:product-editor:workspace:product-1',
          kind: 'runtime_document',
          providerId: 'product-editor-local',
          entityType: 'product_editor_workspace_state',
        },
      ],
      resolved: {
        refs: [
          { id: 'page:product-editor', kind: 'static_node' },
          {
            id: 'runtime:product-editor:workspace:product-1',
            kind: 'runtime_document',
            providerId: 'product-editor-local',
            entityType: 'product_editor_workspace_state',
          },
        ],
        nodes: [
          {
            id: 'page:product-editor',
            kind: 'page',
            name: 'Product Editor',
            description: 'Product editor workspace',
            tags: ['products', 'editor'],
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
            id: 'runtime:product-editor:workspace:product-1',
            kind: 'runtime_document',
            entityType: 'product_editor_workspace_state',
            title: 'Product Editor workspace for Vintage Lamp',
            summary: 'Live product editor state.',
            status: null,
            tags: ['products', 'validation'],
            relatedNodeIds: ['page:product-editor'],
            facts: {
              activeTab: 'validation',
              visibleIssueCount: 3,
            },
            sections: [],
            provenance: { source: 'test' },
          },
        ],
        truncated: false,
        engineVersion: 'registry:test',
      },
      engineVersion: 'registry:test',
    });
    resolveBrainExecutionConfigForCapabilityMock.mockResolvedValue({
      modelId: 'gpt-4.1-mini',
      temperature: 0,
      maxTokens: 300,
      systemPrompt: 'Brain system prompt',
      brainApplied: {
        capability: 'product.validation.runtime',
      },
    });
    runBrainChatCompletionMock.mockResolvedValue({
      text: JSON.stringify({
        match: true,
        message: 'Field must be adjusted.',
      }),
    });
  });

  it('hydrates the AI runtime with the resolved product editor registry prompt', async () => {
    const { POST_handler } = await import('./handler');

    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/products/validator-runtime/evaluate', {
        method: 'POST',
      }),
      {
        body: {
          values: {
            name_en: 'Vintage Lamp',
          },
          latestProductValues: null,
          patternIds: ['pattern-runtime-1'],
          validationScope: 'product_edit',
          contextRegistry: {
            refs: [{ id: 'page:product-editor', kind: 'static_node' }],
            engineVersion: 'page-context:v1',
          },
        },
      } as never
    );

    const data = await response.json();
    const call = runBrainChatCompletionMock.mock.calls[0]?.[0];

    expect(resolveProductEditorContextRegistryEnvelopeMock).toHaveBeenCalledWith({
      refs: [{ id: 'page:product-editor', kind: 'static_node' }],
      engineVersion: 'page-context:v1',
    });
    expect(call.messages[0]).toMatchObject({
      role: 'system',
    });
    expect(call.messages[0].content).toContain('Brain system prompt');
    expect(call.messages[0].content).toContain(
      'Context Registry bundle for the current Product Editor workspace.'
    );
    expect(call.messages[0].content).toContain('"activeTab": "validation"');
    expect(data).toMatchObject({
      evaluatedPatternCount: 1,
      issues: {
        name_en: [
          expect.objectContaining({
            patternId: 'pattern-runtime-1',
            message: 'Field must be adjusted.',
          }),
        ],
      },
    });
  });

  it('accepts a null context registry envelope in the runtime evaluation schema', async () => {
    const { evaluateRuntimeSchema } = await import('./handler');

    expect(() =>
      evaluateRuntimeSchema.parse({
        values: {
          name_en: 'Vintage Lamp',
        },
        latestProductValues: null,
        patternIds: ['pattern-runtime-1'],
        validationScope: 'product_edit',
        contextRegistry: null,
      })
    ).not.toThrow();
  });
});
