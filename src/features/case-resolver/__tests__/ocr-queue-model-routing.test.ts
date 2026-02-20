import { describe, expect, it } from 'vitest';

import {
  inferCaseResolverOcrProviderFromModel,
  isRetryableCaseResolverOcrError,
  resolveCaseResolverOcrModel,
} from '@/features/jobs/workers/caseResolverOcrQueue';

describe('case resolver OCR queue model routing helpers', () => {
  it('infers provider from model id patterns', () => {
    expect(inferCaseResolverOcrProviderFromModel('gpt-4o-mini')).toBe('openai');
    expect(inferCaseResolverOcrProviderFromModel('claude-3-5-sonnet-20241022')).toBe('anthropic');
    expect(inferCaseResolverOcrProviderFromModel('gemini-1.5-pro')).toBe('gemini');
    expect(inferCaseResolverOcrProviderFromModel('llama3.2-vision')).toBe('ollama');
  });

  it('supports provider-prefixed model ids', () => {
    expect(resolveCaseResolverOcrModel('openai:gpt-4o')).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
    });
    expect(resolveCaseResolverOcrModel('anthropic/claude-3-5-haiku-20241022')).toEqual({
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
    });
  });

  it('uses fallback model when runtime model is empty', () => {
    expect(resolveCaseResolverOcrModel('', 'gemini-1.5-flash')).toEqual({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    });
  });

  it('throws when both runtime and fallback model are empty', () => {
    expect(() => resolveCaseResolverOcrModel('', '')).toThrow(
      'OCR model is not configured.'
    );
  });

  it('classifies transient transport/provider errors as retryable', () => {
    expect(
      isRetryableCaseResolverOcrError(
        new Error('OpenAI OCR request timed out after 120000ms.')
      )
    ).toBe(true);
    expect(
      isRetryableCaseResolverOcrError(new Error('HTTP 429 rate limit'))
    ).toBe(true);
    expect(
      isRetryableCaseResolverOcrError(new Error('read ECONNRESET'))
    ).toBe(true);
    expect(
      isRetryableCaseResolverOcrError(new Error('Invalid filepath.'))
    ).toBe(false);
  });
});
