import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  requiresHumanApproval,
  evaluateApprovalGateWithLLM,
} from '@/features/ai/agent-runtime/audit/gate';

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
      global.fetch = vi.fn();
    });

    it('should parse LLM response correctly', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            requiresApproval: true,
            reason: 'Payment detected',
            riskLevel: 'high',
          }),
        },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
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
      (global.fetch as any).mockRejectedValue(new Error('Down'));
      const result = await evaluateApprovalGateWithLLM({
        prompt: 'Buy stuff',
        step: { title: 'Click Pay' } as any,
        model: 'llama3',
      });
      expect(result).toBeNull();
    });
  });
});
