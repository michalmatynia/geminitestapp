import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as api from '@/features/ai/ai-paths/lib/api';
import { 
  handleTemplate, 
  handlePrompt, 
  handleModel, 
  handleAiDescription, 
  handleDescriptionUpdater 
} from '@/features/ai/ai-paths/lib/core/runtime/handlers/generation';

import { createMockContext } from '../../test-utils';

vi.mock('@/features/ai/ai-paths/lib/api', () => ({
  aiJobsApi: {
    enqueue: vi.fn(),
    poll: vi.fn(),
  },
  aiGenerationApi: {
    generateDescription: vi.fn(),
    updateProductDescription: vi.fn(),
  },
}));

describe('Generation Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTemplate', () => {
    it('should render template with inputs', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'template',
          config: { template: { template: 'Hello {{name}}' } }
        } as any,
        nodeInputs: { name: 'World' }
      });
      const result = await handleTemplate(ctx);
      expect(result['prompt']).toBe('Hello World');
    });
  });

  describe('handlePrompt', () => {
    it('should build prompt output', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'prompt',
          config: { prompt: { template: 'Task: {{value}}' } }
        } as any,
        nodeInputs: { value: 'Translate this' }
      });
      const result = await handlePrompt(ctx);
      expect(result['prompt']).toBe('Task: Translate this');
    });
  });

  describe('handleModel', () => {
    it('should enqueue AI model job', async () => {
      vi.mocked(api.aiJobsApi.enqueue).mockResolvedValue({
        ok: true,
        data: { jobId: 'job-123' }
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } }
        } as any,
        nodeInputs: { prompt: 'Do something' }
      });
      const result = await handleModel(ctx);
      expect(result['jobId']).toBe('job-123');
      expect(result['status']).toBe('queued');
      expect(api.aiJobsApi.enqueue).toHaveBeenCalled();
    });
  });

  describe('handleAiDescription', () => {
    it('should call generateDescription API', async () => {
      vi.mocked(api.aiGenerationApi.generateDescription).mockResolvedValue({
        ok: true,
        data: { description: 'Generated description' }
      } as any);

      const ctx = createMockContext({
        nodeInputs: { entityJson: { id: 'p1' } }
      });
      const result = await handleAiDescription(ctx);
      expect(result['description_en']).toBe('Generated description');
      expect(api.aiGenerationApi.generateDescription).toHaveBeenCalled();
    });
  });

  describe('handleDescriptionUpdater', () => {
    it('should call updateProductDescription API', async () => {
      vi.mocked(api.aiGenerationApi.updateProductDescription).mockResolvedValue({
        ok: true
      } as any);

      const ctx = createMockContext({
        nodeInputs: { productId: 'p1', description_en: 'New description' }
      });
      const result = await handleDescriptionUpdater(ctx);
      expect(result['description_en']).toBe('New description');
      expect(api.aiGenerationApi.updateProductDescription).toHaveBeenCalledWith('p1', 'New description');
    });
  });
});