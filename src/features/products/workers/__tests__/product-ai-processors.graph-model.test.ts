import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processGraphModel, type Job } from '../product-ai-processors';
import { resolveAiPathsNodeExecutionConfig } from '@/shared/lib/ai-brain/server';
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
