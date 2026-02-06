import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  addAgentMemory,
  listAgentMemory,
  validateAgentLongTermMemory,
} from '@/features/ai/agent-runtime/memory/index';
import prisma from '@/shared/lib/db/prisma';

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

// Mock fetch for Ollama inside tests
// global.fetch = vi.fn(); // Removed top level

describe('Agent Runtime - Memory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
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
        message: {
          content: JSON.stringify({
            valid: true,
            issues: [],
            reason: 'Looks good',
          }),
        },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await validateAgentLongTermMemory({
        content: 'Valid memory',
        model: 'llama3',
      });

      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Looks good');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('You validate long-term memory entries'),
        })
      );
    });

    it('should return invalid when Ollama reports issues', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            valid: false,
            issues: ['Too vague'],
            reason: 'Bad',
          }),
        },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await validateAgentLongTermMemory({
        content: 'Bad memory',
        model: 'llama3',
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Too vague');
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await validateAgentLongTermMemory({
        content: 'Any memory',
        model: 'llama3',
      });

      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('Memory validation failed');
    });
  });
});
