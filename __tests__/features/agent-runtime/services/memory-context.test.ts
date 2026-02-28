import { vi, describe, it, expect, beforeEach } from 'vitest';

import * as memoryModule from '@/features/ai/agent-runtime/memory';
import { addProblemSolutionMemory } from '@/features/ai/agent-runtime/memory/context';

vi.mock('@/features/ai/agent-runtime/memory', () => ({
  validateAndAddAgentLongTermMemory: vi.fn().mockResolvedValue({ skipped: false }),
}));

describe('Agent Runtime - Memory Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format and add problem-solution memory', async () => {
    const params = {
      memoryKey: 'key-1',
      runId: 'run-1',
      problem: 'Element not clickable',
      countermeasure: 'Scroll into view',
      context: { selector: '.btn' },
      tags: ['playwright'],
    };

    await addProblemSolutionMemory(params);

    expect(memoryModule.validateAndAddAgentLongTermMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryKey: 'key-1',
        content: 'Problem: Element not clickable \u00b7 Countermeasure: Scroll into view',
        tags: ['problem-solution', 'playwright'],
        metadata: expect.objectContaining({
          problem: 'Element not clickable',
          countermeasure: 'Scroll into view',
          selector: '.btn',
        }),
      })
    );
  });

  it('should do nothing if required params are missing', async () => {
    await addProblemSolutionMemory({
      memoryKey: '',
      runId: '1',
      problem: 'P',
      countermeasure: 'C',
    });
    expect(memoryModule.validateAndAddAgentLongTermMemory).not.toHaveBeenCalled();
  });
});
