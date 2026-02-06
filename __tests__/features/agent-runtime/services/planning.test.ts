import { vi, describe, it, expect, beforeEach } from 'vitest';

import { buildPlanWithLLM, evaluatePlanWithLLM } from '@/features/ai/agent-runtime/planning/llm';

// Mock fetch for Ollama inside tests
// global.fetch = vi.fn();

// Mock prisma used in logging
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    agentAuditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Agent Runtime - Planning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('buildPlanWithLLM', () => {
    it('should build a plan from LLM response (Happy Path)', async () => {
      const mockPlan = {
        decision: { action: 'tool', toolName: 'playwright', reason: 'Need to browse' },
        steps: [
          { title: 'Step 1', tool: 'playwright', expectedObservation: 'Obs 1' },
        ],
        summary: 'Plan summary',
      };
      
      const mockDedupe = { steps: mockPlan.steps };
      const mockGuard = { steps: mockPlan.steps };
      const mockEval = { score: 90, revisedSteps: [] };
      const mockOptimize = { optimizedSteps: [] };

      // Mock sequential responses for Plan -> Dedupe -> Guard -> Eval -> Optimize
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => await Promise.resolve({ message: { content: JSON.stringify(mockPlan) } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => await Promise.resolve({ message: { content: JSON.stringify(mockDedupe) } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => await Promise.resolve({ message: { content: JSON.stringify(mockGuard) } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => await Promise.resolve({ message: { content: JSON.stringify(mockEval) } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => await Promise.resolve({ message: { content: JSON.stringify(mockOptimize) } }),
        });

      const result = await buildPlanWithLLM({
        prompt: 'Search for X',
        memory: [],
        model: 'llama3',
      });

      expect(result.source).toBe('llm');
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.title).toBe('Step 1');
      expect(result.decision.action).toBe('tool');
    });

    it('should fallback to heuristic on LLM failure', async () => {
      (global.fetch as any).mockRejectedValue(new Error('LLM Down'));

      const result = await buildPlanWithLLM({
        prompt: 'Search for X',
        memory: [],
        model: 'llama3',
      });

      expect(result.source).toBe('heuristic');
      expect(result.steps).not.toHaveLength(0); // Should have fallback steps
      expect(result.decision).toBeDefined();
    });

    it('should fallback to heuristic on Invalid JSON', async () => {
      const mockResponse = {
        message: {
          content: 'Not JSON',
        },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await buildPlanWithLLM({
        prompt: 'Search for X',
        memory: [],
        model: 'llama3',
      });

      expect(result.source).toBe('heuristic');
    });
  });

  describe('evaluatePlanWithLLM', () => {
    it('should return evaluation score', async () => {
      const mockEval = {
        score: 85,
        issues: [],
        revisedSteps: [],
      };
      
      const mockResponse = {
        message: {
          content: JSON.stringify(mockEval),
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await evaluatePlanWithLLM({
        prompt: 'Task',
        model: 'llama3',
        memory: [],
        steps: [],
        hierarchy: null,
        meta: null,
        maxSteps: 10,
        maxStepAttempts: 3
      });

      expect(result).not.toBeNull();
      expect(result?.score).toBe(85);
    });
  });
});