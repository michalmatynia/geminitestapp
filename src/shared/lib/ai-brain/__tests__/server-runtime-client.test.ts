import { describe, expect, it } from 'vitest';

import { isBrainModelVisionCapable } from '../server-runtime-client';

describe('ai-brain server runtime client', () => {
  it('treats Ollama Gemma multimodal models as vision-capable', () => {
    expect(isBrainModelVisionCapable('gemma')).toBe(true);
    expect(isBrainModelVisionCapable('gemma3:27b')).toBe(true);
    expect(isBrainModelVisionCapable('ollama:gemma-4')).toBe(true);
  });
});
