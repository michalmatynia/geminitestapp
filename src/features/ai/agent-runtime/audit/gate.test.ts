import { afterEach, describe, expect, it, vi } from 'vitest';

const { runBrainChatCompletionMock } = vi.hoisted(() => ({
  runBrainChatCompletionMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: runBrainChatCompletionMock,
}));

import { evaluateApprovalGateWithLLM } from '@/features/ai/agent-runtime/audit/gate';

describe('agent runtime approval gate transport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    runBrainChatCompletionMock.mockReset();
  });

  it('routes approval gate evaluation through the Brain runtime client', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    runBrainChatCompletionMock.mockResolvedValue({
      text: '{"requiresApproval":true,"reason":"login step","riskLevel":"high"}',
      vendor: 'openai',
      modelId: 'gpt-4o-mini',
    });

    const result = await evaluateApprovalGateWithLLM({
      prompt: 'log into the admin panel',
      step: {
        id: 'step-1',
        title: 'Log in',
        status: 'pending',
        tool: 'playwright',
        attempts: 0,
        maxAttempts: 1,
      },
      model: 'openai:gpt-4o-mini',
    });

    expect(result).toEqual({
      requiresApproval: true,
      reason: 'login step',
      riskLevel: 'high',
    });
    expect(runBrainChatCompletionMock).toHaveBeenCalledWith({
      modelId: 'openai:gpt-4o-mini',
      temperature: 0.1,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'You decide whether a planned web action requires human approval. Return only JSON with keys: requiresApproval (boolean), reason (string), riskLevel (low|medium|high), riskySignals (array). Flag any step that involves login, payments, deletions, account changes, admin actions, or irreversible changes.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt: 'log into the admin panel',
            step: {
              title: 'Log in',
              tool: 'playwright',
              expectedObservation: null,
              successCriteria: null,
            },
            browserContext: null,
          }),
        },
      ],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
