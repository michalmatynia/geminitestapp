import { vi, describe, it, expect, beforeEach } from 'vitest';

import { validateAgentLongTermMemory } from '@/features/ai/agent-runtime/memory/index';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

// Mock Brain server utilities
vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(async () => ({
    modelId: 'mock-model',
    temperature: 0.7,
    maxTokens: 1000,
  })),
}));

// Mock Brain runtime client
vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: vi.fn(),
  supportsBrainJsonMode: vi.fn(() => true),
}));

describe('Agent Runtime - Memory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAgentLongTermMemory', () => {
    it('should validate valid memory content via Ollama', async () => {
      const mockResponse = {
        text: JSON.stringify({
          valid: true,
          issues: [],
          reason: 'Looks good',
        }),
      };
      vi.mocked(runBrainChatCompletion).mockResolvedValueOnce(mockResponse as any);

      const result = await validateAgentLongTermMemory({
        content: 'Valid memory',
        model: 'llama3',
      });

      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Looks good');
      expect(runBrainChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'llama3',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Valid memory'),
            }),
          ]),
        })
      );
    });

    it('should return invalid when Ollama reports issues', async () => {
      const mockResponse = {
        text: JSON.stringify({
          valid: false,
          issues: ['Too vague'],
          reason: 'Bad',
        }),
      };
      vi.mocked(runBrainChatCompletion).mockResolvedValueOnce(mockResponse as any);

      const result = await validateAgentLongTermMemory({
        content: 'Bad memory',
        model: 'llama3',
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Too vague');
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(runBrainChatCompletion).mockRejectedValueOnce(new Error('Network error'));

      const result = await validateAgentLongTermMemory({
        content: 'Any memory',
        model: 'llama3',
      });

      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('Memory validation failed');
    });
  });
});
