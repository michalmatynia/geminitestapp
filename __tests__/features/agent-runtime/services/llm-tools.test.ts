import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  validateExtractionWithLLM,
  normalizeExtractionItemsWithLLM,
  inferSelectorsFromLLM,
  buildExtractionPlan,
  decideSearchFirstWithLLM,
} from '@/features/ai/agent-runtime/tools/llm/index';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    agentAuditLog: { create: vi.fn() },
  },
}));

const mockContext = {
  model: 'llama3',
  runId: 'run-1',
  log: vi.fn(),
};

describe('Agent Runtime - LLM Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('validateExtractionWithLLM', () => {
    it('should parse valid validation response', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            valid: true,
            acceptedItems: ['Item 1'],
            rejectedItems: ['Noise'],
            issues: [],
            missingCount: 0,
          }),
        },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await validateExtractionWithLLM(mockContext, {
        prompt: 'Extract items',
        url: 'http://test.com',
        extractionType: 'product_names',
        requiredCount: 1,
        items: ['Item 1', 'Noise'],
        domTextSample: 'Sample text',
        targetHostname: 'test.com',
        evidence: [],
      });

      expect(result.valid).toBe(true);
      expect(result.acceptedItems).toEqual(['Item 1']);
    });

    it('should handle LLM failure with fallback', async () => {
      (global.fetch as any).mockRejectedValue(new Error('LLM Down'));

      const result = await validateExtractionWithLLM(mockContext, {
        prompt: 'Extract',
        url: 'http://test.com',
        extractionType: 'product_names',
        requiredCount: 5,
        items: ['A'],
        domTextSample: '',
        targetHostname: null,
        evidence: [{ item: 'A', snippet: '...' }],
      });

      expect(result.acceptedItems).toEqual(['A']);
      expect(result.issues[0]).toContain('LLM validation failed');
    });
  });

  describe('normalizeExtractionItemsWithLLM', () => {
    it('should return items as-is if no normalization model provided', async () => {
      const result = await normalizeExtractionItemsWithLLM(mockContext, {
        prompt: 'Clean',
        extractionType: 'emails',
        items: ['A@B.COM'],
        normalizationModel: null,
      });
      expect(result).toEqual(['A@B.COM']);
    });

    it('should clean items using LLM', async () => {
      const mockResponse = {
        message: { content: JSON.stringify({ items: ['a@b.com'] }) },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await normalizeExtractionItemsWithLLM(mockContext, {
        prompt: 'Clean',
        extractionType: 'emails',
        items: ['A@B.COM'],
        normalizationModel: 'cleaner-v1',
      });
      expect(result).toEqual(['a@b.com']);
    });
  });

  describe('inferSelectorsFromLLM', () => {
    it('should return selectors from LLM', async () => {
      const mockResponse = {
        message: { content: JSON.stringify({ selectors: ['.prod'] }) },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await inferSelectorsFromLLM(
        mockContext,
        { some: 'inventory' },
        'sample',
        'task',
        'label'
      );

      expect(result).toEqual(['.prod']);
      expect(prisma.agentAuditLog.create).toHaveBeenCalled();
    });
  });

  describe('buildExtractionPlan', () => {
    it('should return structured plan', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            target: 'products',
            fields: ['name'],
            primarySelectors: ['.p'],
            fallbackSelectors: [],
            notes: 'None',
          }),
        },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await buildExtractionPlan(mockContext, {
        type: 'product_names',
        domTextSample: '...',
        uiInventory: {},
      });

      expect(result?.target).toBe('products');
      expect(result?.primarySelectors).toEqual(['.p']);
    });
  });

  describe('decideSearchFirstWithLLM', () => {
    it('should decide whether to search', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            useSearchFirst: true,
            query: 'example shop',
            reason: 'Domain not found',
          }),
        },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await decideSearchFirstWithLLM(mockContext, 'Find shop', 'about:blank', false);

      expect(result?.useSearchFirst).toBe(true);
      expect(result?.query).toBe('example shop');
    });
  });
});
