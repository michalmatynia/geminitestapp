import { describe, expect, it } from 'vitest';

describe('shared contracts index runtime smoke', () => {
  it('imports contracts barrel and exposes key schemas', async () => {
    const contracts = await import('@/shared/contracts');

    expect(contracts.databasePreviewRequestSchema).toBeDefined();
    expect(contracts.aiNodeSchema).toBeDefined();
  });
});
