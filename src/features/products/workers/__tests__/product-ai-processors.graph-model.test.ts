import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processGraphModel, type Job } from '../product-ai-processors';
import { resolveAiPathsNodeExecutionConfig } from '@/shared/lib/ai-brain/server';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import { configurationError } from '@/shared/errors/app-error';

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveAiPathsNodeExecutionConfig: vi.fn(),
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/model-vendor', () => ({
  inferBrainModelVendor: vi.fn(),
}));

const buildJob = (payloadPatch: Record<string, unknown> = {}): Job =>
  ({
    id: 'job-graph-model-1',
    productId: 'path_local_test',
    status: 'pending',
    type: 'graph_model',
    payload: {
      prompt: 'Write a concise collectible listing description.',
      modelId: 'gemma3:27b',
      temperature: 0.42,
      maxTokens: 333,
      source: 'ai_paths',
      vision: false,
      ...payloadPatch,
    },
    createdAt: new Date('2026-03-05T10:00:00.000Z'),
    updatedAt: new Date('2026-03-05T10:00:00.000Z'),
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
    result: null,
  }) as unknown as Job;

describe('processGraphModel AI Paths model selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inferBrainModelVendor).mockReturnValue('ollama');
    vi.mocked(runBrainChatCompletion).mockResolvedValue({
      text: 'Generated copy',
      vendor: 'ollama',
      modelId: 'gemma3:27b',
    });
  });

  it('uses AI Brain routing when capability config resolves', async () => {
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockResolvedValue({
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'ollama:brain-default',
        agentId: '',
        temperature: 0.3,
        maxTokens: 222,
        systemPrompt: 'Brain system',
      },
      capability: 'ai_paths.model',
      feature: 'ai_paths',
      provider: 'model',
      agentId: '',
      modelId: 'ollama:brain-default',
      temperature: 0.3,
      maxTokens: 222,
      systemPrompt: 'Brain system',
      brainApplied: {
        capability: 'ai_paths.model',
        feature: 'ai_paths',
        modelFamily: 'chat',
        runtimeKind: 'chat',
        provider: 'model',
        modelId: 'ollama:brain-default',
        temperature: 0.3,
        maxTokens: 222,
        systemPromptApplied: true,
        modelSelectionSource: 'brain_default',
        enforced: true,
      },
    });

    const result = await processGraphModel(buildJob());

    expect(runBrainChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'ollama:brain-default',
        temperature: 0.3,
        maxTokens: 222,
      })
    );
    expect(result['modelId']).toBe('ollama:brain-default');
  });

  it('passes graph.requestedModelId to AI Brain when the top-level payload modelId is missing', async () => {
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockResolvedValue({
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: '',
        agentId: '',
        temperature: 0.3,
        maxTokens: 222,
        systemPrompt: 'Brain system',
      },
      capability: 'ai_paths.model',
      feature: 'ai_paths',
      provider: 'model',
      agentId: '',
      modelId: 'gemma3:27b',
      temperature: 0.3,
      maxTokens: 222,
      systemPrompt: 'Brain system',
      brainApplied: {
        capability: 'ai_paths.model',
        feature: 'ai_paths',
        modelFamily: 'chat',
        runtimeKind: 'chat',
        provider: 'model',
        modelId: 'gemma3:27b',
        temperature: 0.3,
        maxTokens: 222,
        systemPromptApplied: true,
        modelSelectionSource: 'node',
        enforced: true,
      },
    });

    await processGraphModel(
      buildJob({
        modelId: '',
        graph: {
          runId: 'run-1',
          nodeId: 'model-node-1',
          requestedModelId: 'gemma3:27b',
        },
      })
    );

    expect(resolveAiPathsNodeExecutionConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedModelId: 'gemma3:27b',
      })
    );
  });

  it('prefers graph.requestedModelId over a conflicting top-level payload.modelId for AI Paths jobs', async () => {
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockResolvedValue({
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: '',
        agentId: '',
        temperature: 0.3,
        maxTokens: 222,
        systemPrompt: 'Brain system',
      },
      capability: 'ai_paths.model',
      feature: 'ai_paths',
      provider: 'model',
      agentId: '',
      modelId: 'node-selected-model',
      temperature: 0.3,
      maxTokens: 222,
      systemPrompt: 'Brain system',
      brainApplied: {
        capability: 'ai_paths.model',
        feature: 'ai_paths',
        modelFamily: 'chat',
        runtimeKind: 'chat',
        provider: 'model',
        modelId: 'node-selected-model',
        temperature: 0.3,
        maxTokens: 222,
        systemPromptApplied: true,
        modelSelectionSource: 'node',
        enforced: true,
      },
    });

    await processGraphModel(
      buildJob({
        modelId: 'stale-top-level-model',
        graph: {
          runId: 'run-1',
          nodeId: 'model-node-1',
          requestedModelId: 'node-selected-model',
        },
      })
    );

    expect(resolveAiPathsNodeExecutionConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedModelId: 'node-selected-model',
      })
    );
  });

  it('recovers the node-selected model from the AI Paths run graph when payload.modelId is blank', async () => {
    vi.mocked(getPathRunRepository).mockResolvedValue({
      findRunById: vi.fn().mockResolvedValue({
        graph: {
          nodes: [
            {
              id: 'model-node-1',
              type: 'model',
              config: {
                model: {
                  modelId: 'gemma3:27b',
                },
              },
            },
          ],
        },
      }),
    } as Awaited<ReturnType<typeof getPathRunRepository>>);
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockResolvedValue({
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: '',
        agentId: '',
        temperature: 0.3,
        maxTokens: 222,
        systemPrompt: 'Brain system',
      },
      capability: 'ai_paths.model',
      feature: 'ai_paths',
      provider: 'model',
      agentId: '',
      modelId: 'gemma3:27b',
      temperature: 0.3,
      maxTokens: 222,
      systemPrompt: 'Brain system',
      brainApplied: {
        capability: 'ai_paths.model',
        feature: 'ai_paths',
        modelFamily: 'chat',
        runtimeKind: 'chat',
        provider: 'model',
        modelId: 'gemma3:27b',
        temperature: 0.3,
        maxTokens: 222,
        systemPromptApplied: true,
        modelSelectionSource: 'node',
        enforced: true,
      },
    });

    await processGraphModel(
      buildJob({
        modelId: '',
        graph: {
          runId: 'run-1',
          nodeId: 'model-node-1',
        },
      })
    );

    expect(getPathRunRepository).toHaveBeenCalled();
    expect(resolveAiPathsNodeExecutionConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedModelId: 'gemma3:27b',
      })
    );
  });

  it('fails when AI Brain config is unavailable even if node model is provided', async () => {
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockRejectedValue(
      configurationError(
        'AI Paths Model has no model assigned in AI Brain, and this Model node did not select one.'
      )
    );

    await expect(
      processGraphModel(
        buildJob({
          modelId: 'gemma3:27b',
          temperature: 0.58,
          maxTokens: 444,
          systemPrompt: 'Node system prompt',
        })
      )
    ).rejects.toThrow('AI Paths Model has no model assigned');
    expect(runBrainChatCompletion).not.toHaveBeenCalled();
  });

  it('does not fallback when no node model is provided', async () => {
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockRejectedValue(
      configurationError('AI Paths Model has no model assigned in AI Brain.')
    );

    await expect(processGraphModel(buildJob({ modelId: '' }))).rejects.toThrow(
      'AI Paths Model has no model assigned'
    );
    expect(runBrainChatCompletion).not.toHaveBeenCalled();
  });

  it('retries once when the completion is empty and keeps the second result', async () => {
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockResolvedValue({
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'ollama:brain-default',
        agentId: '',
        temperature: 0.6,
        maxTokens: 500,
        systemPrompt: 'Brain system',
      },
      capability: 'ai_paths.model',
      feature: 'ai_paths',
      provider: 'model',
      agentId: '',
      modelId: 'ollama:brain-default',
      temperature: 0.6,
      maxTokens: 500,
      systemPrompt: 'Brain system',
      brainApplied: {
        capability: 'ai_paths.model',
        feature: 'ai_paths',
        modelFamily: 'chat',
        runtimeKind: 'chat',
        provider: 'model',
        modelId: 'ollama:brain-default',
        temperature: 0.6,
        maxTokens: 500,
        systemPromptApplied: true,
        modelSelectionSource: 'brain_default',
        enforced: true,
      },
    });
    vi.mocked(runBrainChatCompletion)
      .mockResolvedValueOnce({
        text: '   ',
        vendor: 'ollama',
        modelId: 'ollama:brain-default',
      })
      .mockResolvedValueOnce({
        text: 'Recovered copy',
        vendor: 'ollama',
        modelId: 'ollama:brain-default',
      });

    const result = await processGraphModel(buildJob());

    expect(runBrainChatCompletion).toHaveBeenCalledTimes(2);
    expect(runBrainChatCompletion).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        modelId: 'ollama:brain-default',
        temperature: 0.6,
        maxTokens: 500,
      })
    );
    expect(runBrainChatCompletion).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        modelId: 'ollama:brain-default',
        temperature: 0.2,
        maxTokens: 900,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        result: 'Recovered copy',
        temperature: 0.2,
        maxTokens: 900,
        completionRetryCount: 1,
        completionRetryReason: 'empty_result',
      })
    );
  });

  it('appends AI Paths context registry workspace state to the system prompt when present', async () => {
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockResolvedValue({
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'ollama:brain-default',
        agentId: '',
        temperature: 0.3,
        maxTokens: 400,
        systemPrompt: 'Brain system',
      },
      capability: 'ai_paths.model',
      feature: 'ai_paths',
      provider: 'model',
      agentId: '',
      modelId: 'ollama:brain-default',
      temperature: 0.3,
      maxTokens: 400,
      systemPrompt: 'Brain system',
      brainApplied: {
        capability: 'ai_paths.model',
        feature: 'ai_paths',
        modelFamily: 'chat',
        runtimeKind: 'chat',
        provider: 'model',
        modelId: 'ollama:brain-default',
        temperature: 0.3,
        maxTokens: 400,
        systemPromptApplied: true,
        modelSelectionSource: 'brain_default',
        enforced: true,
      },
    });

    await processGraphModel(
      buildJob({
        contextRegistry: {
          refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
          engineVersion: 'page-context:v1',
          resolved: {
            refs: [{ id: 'runtime:ai-paths:workspace', kind: 'runtime_document' }],
            nodes: [],
            documents: [
              {
                id: 'runtime:ai-paths:workspace',
                kind: 'runtime_document',
                entityType: 'ai_paths_workspace_state',
                title: 'AI Paths workspace state',
                summary: 'Live state',
                status: 'running',
                tags: ['ai-paths'],
                relatedNodeIds: ['page:ai-paths'],
                facts: { activePathId: 'path_local_test', selectedNodeId: 'node-1' },
                sections: [],
                provenance: { source: 'test' },
              },
            ],
            truncated: false,
            engineVersion: 'page-context:v1',
          },
        },
      })
    );

    const call = vi.mocked(runBrainChatCompletion).mock.calls[0]?.[0];
    const systemMessage = Array.isArray(call?.messages) ? call.messages[0]?.content : null;

    expect(typeof systemMessage).toBe('string');
    expect(systemMessage).toContain('Brain system');
    expect(systemMessage).toContain('Context Registry bundle for the current AI Paths workspace.');
    expect(systemMessage).toContain('"activePathId": "path_local_test"');
  });

  it('retries once for JSON-looking truncated completions', async () => {
    vi.mocked(resolveAiPathsNodeExecutionConfig).mockResolvedValue({
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'ollama:brain-default',
        agentId: '',
        temperature: 0.3,
        maxTokens: 700,
        systemPrompt: 'Brain system',
      },
      capability: 'ai_paths.model',
      feature: 'ai_paths',
      provider: 'model',
      agentId: '',
      modelId: 'ollama:brain-default',
      temperature: 0.3,
      maxTokens: 700,
      systemPrompt: 'Brain system',
      brainApplied: {
        capability: 'ai_paths.model',
        feature: 'ai_paths',
        modelFamily: 'chat',
        runtimeKind: 'chat',
        provider: 'model',
        modelId: 'ollama:brain-default',
        temperature: 0.3,
        maxTokens: 700,
        systemPromptApplied: true,
        modelSelectionSource: 'brain_default',
        enforced: true,
      },
    });
    vi.mocked(runBrainChatCompletion)
      .mockResolvedValueOnce({
        text: '{"parameters":[{"parameterId":"color","value":"Niebieski"}',
        vendor: 'ollama',
        modelId: 'ollama:brain-default',
      })
      .mockResolvedValueOnce({
        text: '{"parameters":[{"parameterId":"color","value":"Niebieski"}]}',
        vendor: 'ollama',
        modelId: 'ollama:brain-default',
      });

    const result = await processGraphModel(
      buildJob({
        prompt: 'Return valid JSON only with translated parameters. Output must be a JSON object.',
      })
    );

    expect(runBrainChatCompletion).toHaveBeenCalledTimes(2);
    expect(runBrainChatCompletion).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        modelId: 'ollama:brain-default',
        temperature: 0.3,
        maxTokens: 1100,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        result: '{"parameters":[{"parameterId":"color","value":"Niebieski"}]}',
        temperature: 0.3,
        maxTokens: 1100,
        completionRetryCount: 1,
        completionRetryReason: 'invalid_json',
      })
    );
  });
});
