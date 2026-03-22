import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_OLLAMA_BASE_URL, resolveOllamaBaseUrl } from '@/shared/lib/ai-brain/ollama-config';

const originalOllamaBaseUrl = process.env['OLLAMA_BASE_URL'];

describe('ollama-config', () => {
  afterEach(() => {
    if (originalOllamaBaseUrl === undefined) {
      delete process.env['OLLAMA_BASE_URL'];
      return;
    }
    process.env['OLLAMA_BASE_URL'] = originalOllamaBaseUrl;
  });

  it('falls back to the default base url when the env var is missing', () => {
    delete process.env['OLLAMA_BASE_URL'];

    expect(resolveOllamaBaseUrl()).toBe(DEFAULT_OLLAMA_BASE_URL);
  });

  it('trims whitespace and trailing slashes from the configured base url', () => {
    process.env['OLLAMA_BASE_URL'] = '  http://ollama.internal:11434///  ';

    expect(resolveOllamaBaseUrl()).toBe('http://ollama.internal:11434');
  });
});
