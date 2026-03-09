import { describe, expect, it } from 'vitest';

import { aiNodeTypeSchema } from '@/shared/contracts/ai-paths-core/base';

describe('ai-paths node type contract', () => {
  it('accepts current supported node types', () => {
    expect(aiNodeTypeSchema.safeParse('trigger').success).toBe(true);
    expect(aiNodeTypeSchema.safeParse('database').success).toBe(true);
    expect(aiNodeTypeSchema.safeParse('subgraph').success).toBe(true);
  });

  it('rejects removed legacy node types', () => {
    expect(aiNodeTypeSchema.safeParse('ai_description').success).toBe(false);
    expect(aiNodeTypeSchema.safeParse('description_updater').success).toBe(false);
  });
});
