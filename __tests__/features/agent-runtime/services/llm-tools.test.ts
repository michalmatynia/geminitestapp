import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  validateExtractionWithLLM,
  normalizeExtractionItemsWithLLM,
  inferSelectorsFromLLM,
  buildExtractionPlan,
  decideSearchFirstWithLLM,
} from '@/features/ai/agent-runtime/tools/llm/index';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

const { agentAuditLogDelegate } = vi.hoisted(() => ({
  agentAuditLogDelegate: {
    create: vi.fn(),
  },
}));

vi.mock('@/features/ai/agent-runtime/store-delegates', () => ({
  getAgentAuditLogDelegate: vi.fn(() => agentAuditLogDelegate),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(async () => ({
    modelId: 'mock-model',
    temperature: 0.7,
    maxTokens: 1000,
  })),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: vi.fn(),
  supportsBrainJsonMode: vi.fn(() => true),
}));

const mockContext = {
  model: 'llama3',
  runId: 'run-1',
  log: vi.fn(),
};

describe('Agent Runtime - LLM Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateExtractionWithLLM', () => {
    it('should parse valid validation response', async () => {
      vi.mocked(runBrainChatCompletion).mockResolvedValueOnce({
        text: JSON.stringify({
          valid: true,
          acceptedItems: ['Item 1'],
          rejectedItems: ['Noise'],
          issues: [],
          missingCount: 0,
        }),
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
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
      vi.mocked(runBrainChatCompletion).mockRejectedValueOnce(new Error('LLM Down'));

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
      vi.mocked(runBrainChatCompletion).mockResolvedValueOnce({
        text: JSON.stringify({ items: ['a@b.com'] }),
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
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
      vi.mocked(runBrainChatCompletion).mockResolvedValueOnce({
        text: JSON.stringify({ selectors: ['.prod'] }),
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      });

      const result = await inferSelectorsFromLLM(
        mockContext,
        { some: 'inventory' },
        'sample',
        'task',
        'label'
      );

      expect(result).toEqual(['.prod']);
      expect(agentAuditLogDelegate.create).toHaveBeenCalled();
    });
  });

  describe('buildExtractionPlan', () => {
    it('should return structured plan', async () => {
      vi.mocked(runBrainChatCompletion).mockResolvedValueOnce({
        text: JSON.stringify({
          target: 'products',
          fields: ['name'],
          primarySelectors: ['.p'],
          fallbackSelectors: [],
          notes: 'None',
        }),
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
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
      vi.mocked(runBrainChatCompletion).mockResolvedValueOnce({
        text: JSON.stringify({
          useSearchFirst: true,
          query: 'example shop',
          reason: 'Domain not found',
        }),
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      });

      const result = await decideSearchFirstWithLLM(mockContext, 'Find shop', 'about:blank', false);

      expect(result?.useSearchFirst).toBe(true);
      expect(result?.query).toBe('example shop');
    });
  });
});
