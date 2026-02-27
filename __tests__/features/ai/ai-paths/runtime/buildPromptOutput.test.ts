import { describe, it, expect } from 'vitest';

import { buildPromptOutput } from '@/shared/lib/ai-paths';

describe('buildPromptOutput', () => {
  it('resolves {{result}} from nodeInputs.result', () => {
    const { promptOutput } = buildPromptOutput(
      { template: 'Prev result: {{result}}' },
      { result: 'hello' }
    );
    expect(promptOutput).toBe('Prev result: hello');
  });

  it('resolves {{result}} when result is an array (does not get stripped by [..] placeholder pass)', () => {
    const { promptOutput } = buildPromptOutput(
      { template: 'Categories: {{result}}' },
      { result: [{ id: 1 }, { id: 2 }] }
    );
    expect(promptOutput).toBe('Categories: [{"id":1},{"id":2}]');
  });

  it('resolves {{value}} from nodeInputs.result (current value)', () => {
    const { promptOutput } = buildPromptOutput(
      { template: 'Prev value: {{value}}' },
      { result: 'abc' }
    );
    expect(promptOutput).toBe('Prev value: abc');
  });
});
