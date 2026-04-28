import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runBrainChatCompletionMock = vi.fn();

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: (...args: unknown[]) =>
    runBrainChatCompletionMock(...(args as [unknown])),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { captureException: vi.fn() },
}));

import { evaluateJobPageWithAi } from './job-scan-ai-evaluator';

describe('evaluateJobPageWithAi', () => {
  beforeEach(() => {
    runBrainChatCompletionMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses a clean JSON response into evaluation', async () => {
    runBrainChatCompletionMock.mockResolvedValue({
      text: JSON.stringify({
        company: { name: 'Acme', nip: '1234567890' },
        listing: {
          title: 'Senior Developer',
          contractType: 'employment',
          workMode: 'hybrid',
          experienceLevel: 'senior',
          requirements: ['TypeScript', 'React'],
        },
        confidence: 0.9,
      }),
      vendor: 'anthropic',
      modelId: 'test-model',
    });

    const result = await evaluateJobPageWithAi({
      sourceUrl: 'https://www.pracuj.pl/praca/dev,oferta,1',
      pageContent: '<html>...</html>',
    });

    expect(result?.error).toBeNull();
    expect(result?.confidence).toBe(0.9);
    expect((result?.company as Record<string, unknown>)?.['name']).toBe('Acme');
    expect((result?.listing as Record<string, unknown>)?.['title']).toBe('Senior Developer');
    expect((result?.listing as Record<string, unknown>)?.['requirements']).toEqual([
      'TypeScript',
      'React',
    ]);
  });

  it('strips markdown fences before parsing', async () => {
    runBrainChatCompletionMock.mockResolvedValue({
      text: '```json\n{"company":{"name":"Foo"},"listing":{"title":"Bar"},"confidence":0.5}\n```',
      vendor: 'anthropic',
      modelId: 'test-model',
    });
    const result = await evaluateJobPageWithAi({
      sourceUrl: 'https://example.com',
      pageContent: '<html/>',
    });
    expect((result?.company as Record<string, unknown>)?.['name']).toBe('Foo');
    expect((result?.listing as Record<string, unknown>)?.['title']).toBe('Bar');
  });

  it('extracts JSON from prose preamble', async () => {
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Here is the result: {"company":null,"listing":{"title":"X"},"confidence":0.1} done',
      vendor: 'anthropic',
      modelId: 'test-model',
    });
    const result = await evaluateJobPageWithAi({
      sourceUrl: 'https://example.com',
      pageContent: 'page',
    });
    expect((result?.listing as Record<string, unknown>)?.['title']).toBe('X');
    expect(result?.confidence).toBe(0.1);
  });

  it('returns error result when LLM throws', async () => {
    runBrainChatCompletionMock.mockRejectedValue(new Error('rate limited'));
    const result = await evaluateJobPageWithAi({
      sourceUrl: 'https://example.com',
      pageContent: 'x',
    });
    expect(result?.error).toBe('rate limited');
    expect(result?.company).toBeNull();
    expect(result?.listing).toBeNull();
  });

  it('returns error result when JSON is malformed', async () => {
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'not json at all',
      vendor: 'anthropic',
      modelId: 'test-model',
    });
    const result = await evaluateJobPageWithAi({
      sourceUrl: 'https://example.com',
      pageContent: 'x',
    });
    expect(result?.error).toBeTruthy();
    expect(result?.company).toBeNull();
  });
});
