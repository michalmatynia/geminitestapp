import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  requiresHumanApproval,
  evaluateApprovalGateWithLLM,
} from '@/features/ai/agent-runtime/audit/gate';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

// Mock the AI Brain client
vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: vi.fn(),
}));

describe('Agent Runtime - Audit Gate', () => {
  describe('requiresHumanApproval (Heuristic)', () => {
    it('should return true for sensitive keywords', () => {
      const step = { title: 'Enter login credentials', tool: 'playwright' as const } as any;
      expect(requiresHumanApproval(step, '')).toBe(true);

      const step2 = { title: 'Complete checkout', tool: 'playwright' as const } as any;
      expect(requiresHumanApproval(step2, '')).toBe(true);

      const step3 = { title: 'Delete account', tool: 'playwright' as const } as any;
      expect(requiresHumanApproval(step3, '')).toBe(true);
    });

    it('should return false for safe keywords', () => {
      const step = { title: 'Browse products', tool: 'playwright' as const } as any;
      expect(requiresHumanApproval(step, '')).toBe(false);

      const step2 = { title: 'Read news', tool: 'playwright' as const } as any;
      expect(requiresHumanApproval(step2, '')).toBe(false);
    });

    it('should return false if tool is none', () => {
      const step = { title: 'Login', tool: 'none' as const } as any;
      expect(requiresHumanApproval(step, '')).toBe(false);
    });
  });

  describe('evaluateApprovalGateWithLLM', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should parse LLM response correctly', async () => {
      const mockResult = {
        requiresApproval: true,
        reason: 'Payment detected',
        riskLevel: 'high',
      };

      vi.mocked(runBrainChatCompletion).mockResolvedValue({
        text: JSON.stringify(mockResult),
        vendor: 'ollama',
        modelId: 'llama3',
      });

      const result = await evaluateApprovalGateWithLLM({
        prompt: 'Buy stuff',
        step: { title: 'Click Pay' } as any,
        model: 'llama3',
      });

      expect(result?.requiresApproval).toBe(true);
      expect(result?.riskLevel).toBe('high');
    });

    it('should fallback to null on error', async () => {
      vi.mocked(runBrainChatCompletion).mockRejectedValue(new Error('Down'));
      const result = await evaluateApprovalGateWithLLM({
        prompt: 'Buy stuff',
        step: { title: 'Click Pay' } as any,
        model: 'llama3',
      });
      expect(result).toBeNull();
    });
  });
});
