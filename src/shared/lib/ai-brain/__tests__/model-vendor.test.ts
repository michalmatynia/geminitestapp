import { describe, expect, it } from 'vitest';

import { inferBrainModelVendor, normalizeBrainModelId } from '../model-vendor';

describe('ai-brain model vendor helpers', () => {
  it('infers vendors from known model families', () => {
    expect(inferBrainModelVendor('gpt-4o-mini')).toBe('openai');
    expect(inferBrainModelVendor('claude-3-5-sonnet-20241022')).toBe('anthropic');
    expect(inferBrainModelVendor('gemini-2.0-flash')).toBe('gemini');
    expect(inferBrainModelVendor('llama3.2')).toBe('ollama');
  });

  it('prefers explicit prefixes and normalizes prefixed model ids', () => {
    expect(inferBrainModelVendor('openai:gpt-4.1-mini')).toBe('openai');
    expect(inferBrainModelVendor('gemini/gemini-1.5-flash')).toBe('gemini');
    expect(normalizeBrainModelId('anthropic:claude-3-5-haiku-20241022')).toBe(
      'claude-3-5-haiku-20241022'
    );
  });
});
