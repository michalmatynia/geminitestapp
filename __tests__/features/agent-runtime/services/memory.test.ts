import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  runBrainChatCompletion,
} from '@/shared/lib/ai-brain/server-runtime-client';

import {
  addAgentMemory,
  listAgentMemory,
  validateAgentLongTermMemory,
} from '@/features/ai/agent-runtime/memory/index';
import prisma from '@/shared/lib/db/prisma';

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

// Mock Prisma
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    agentMemoryItem: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    agentLongTermMemory: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

describe('Agent Runtime - Memory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addAgentMemory', () => {
    it('should create a memory item in prisma', async () => {
      const mockParams = {
        scope: 'session' as const,
        content: 'test content',
        runId: 'run-123',
      };
      (prisma.agentMemoryItem.create as any).mockResolvedValue({
        id: 'mem-1',
        ...mockParams,
      });

      const result = await addAgentMemory(mockParams);

      expect(prisma.agentMemoryItem.create).toHaveBeenCalledWith({
        data: {
          runId: 'run-123',
          personaId: null,
          scope: 'session',
          content: 'test content',
        },
      });
      expect(result).toEqual({ id: 'mem-1', ...mockParams });
    });
  });

  describe('listAgentMemory', () => {
    it('should list memory items from prisma', async () => {
      (prisma.agentMemoryItem.findMany as any).mockResolvedValue([
        { id: 'mem-1', content: 'A' },
        { id: 'mem-2', content: 'B' },
      ]);

      const result = await listAgentMemory({ runId: 'run-123' });

      expect(prisma.agentMemoryItem.findMany).toHaveBeenCalledWith({
        where: { runId: 'run-123' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(2);
    });
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
