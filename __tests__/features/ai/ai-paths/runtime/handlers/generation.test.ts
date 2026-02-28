import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

import * as api from '@/shared/lib/ai-paths/api';
import {
  handleTemplate,
  handlePrompt,
  handleModel,
  handleAiDescription,
  handleDescriptionUpdater,
} from '@/shared/lib/ai-paths/core/runtime/handlers/generation';

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
  const originalAllowedHosts = process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS'];
  const originalDeniedHosts = process.env['AI_PATHS_OUTBOUND_DENY_HOSTS'];

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS'];
    delete process.env['AI_PATHS_OUTBOUND_DENY_HOSTS'];
  });

  afterAll(() => {
    if (originalAllowedHosts === undefined) {
      delete process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS'];
    } else {
      process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS'] = originalAllowedHosts;
    }
    if (originalDeniedHosts === undefined) {
      delete process.env['AI_PATHS_OUTBOUND_DENY_HOSTS'];
    } else {
      process.env['AI_PATHS_OUTBOUND_DENY_HOSTS'] = originalDeniedHosts;
    }
  });

  describe('handleTemplate', () => {
    it('should render template with inputs', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'template',
          config: { template: { template: 'Hello {{name}}' } },
        } as any,
        nodeInputs: { name: 'World' },
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
          config: { prompt: { template: 'Task: {{value}}' } },
        } as any,
        nodeInputs: { value: 'Translate this' },
      });
      const result = await handlePrompt(ctx);
      expect(result['prompt']).toBe('Task: Translate this');
    });
  });

  describe('handleModel', () => {
    it('should enqueue AI model job', async () => {
      vi.mocked(api.aiJobsApi.enqueue).mockResolvedValue({
        ok: true,
        data: { jobId: 'job-123' },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: { prompt: 'Do something' },
      });
      const result = await handleModel(ctx);
      expect(result['jobId']).toBe('job-123');
      expect(result['status']).toBe('queued');
      expect(api.aiJobsApi.enqueue).toHaveBeenCalled();
    });

    it('should filter blocked image URLs by outbound policy before enqueue', async () => {
      vi.mocked(api.aiJobsApi.enqueue).mockResolvedValue({
        ok: true,
        data: { jobId: 'job-123' },
      } as any);
      const reportAiPathsError = vi.fn();
      const toast = vi.fn();

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt', 'images'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: {
          prompt: 'Do something',
          images: [
            'https://cdn.example.com/image-1.jpg',
            'http://169.254.169.254/latest/meta-data/',
          ],
        },
        reportAiPathsError,
        toast,
      });
      const result = await handleModel(ctx);
      expect(result['jobId']).toBe('job-123');
      expect(result['status']).toBe('queued');
      expect(api.aiJobsApi.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'graph_model',
          payload: expect.objectContaining({
            imageUrls: ['https://cdn.example.com/image-1.jpg'],
          }),
        })
      );
      expect(reportAiPathsError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          action: 'graphModel',
          blockedImageUrlCount: 1,
        }),
        expect.stringContaining('Blocked 1 image URL')
      );
      expect(toast).toHaveBeenCalledWith(
        expect.stringContaining('Blocked 1 image URL'),
        expect.objectContaining({ variant: 'warning' })
      );
    });

    it('returns blocked status when prompt is missing', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: {},
      });
      const result = await handleModel(ctx);
      expect(result['status']).toBe('blocked');
      expect(result['skipReason']).toBe('missing_prompt');
      expect(result['result']).toBe('');
      expect(api.aiJobsApi.enqueue).not.toHaveBeenCalled();
    });

    it('returns skipped status when AI jobs are disabled', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: { prompt: 'Do something' },
        skipAiJobs: true,
      });
      const result = await handleModel(ctx);
      expect(result['status']).toBe('skipped');
      expect(result['skipReason']).toBe('ai_jobs_disabled');
      expect(result['result']).toBe('');
      expect(api.aiJobsApi.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('handleAiDescription', () => {
    it('should call generateDescription API', async () => {
      vi.mocked(api.aiGenerationApi.generateDescription).mockResolvedValue({
        ok: true,
        data: { description: 'Generated description' },
      } as any);

      const ctx = createMockContext({
        nodeInputs: { entityJson: { id: 'p1' } },
      });
      const result = await handleAiDescription(ctx);
      expect(result['description_en']).toBe('Generated description');
      expect(api.aiGenerationApi.generateDescription).toHaveBeenCalled();
    });

    it('should filter blocked image URLs by outbound policy before description generation', async () => {
      vi.mocked(api.aiGenerationApi.generateDescription).mockResolvedValue({
        ok: true,
        data: { description: 'Generated description' },
      } as any);
      const reportAiPathsError = vi.fn();
      const toast = vi.fn();

      const ctx = createMockContext({
        node: {
          id: 'n-description',
          type: 'description',
        } as any,
        nodeInputs: {
          entityJson: {
            id: 'p1',
            images: ['https://cdn.example.com/image-2.jpg', 'http://127.0.0.1/private.jpg'],
          },
        },
        reportAiPathsError,
        toast,
      });
      const result = await handleAiDescription(ctx);
      expect(result['description_en']).toBe('Generated description');
      expect(api.aiGenerationApi.generateDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: ['https://cdn.example.com/image-2.jpg'],
        })
      );
      expect(reportAiPathsError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          action: 'aiDescription',
          blockedImageUrlCount: 1,
        }),
        expect.stringContaining('Blocked 1 image URL')
      );
      expect(toast).toHaveBeenCalledWith(
        expect.stringContaining('Blocked 1 image URL'),
        expect.objectContaining({ variant: 'warning' })
      );
    });
  });

  describe('handleDescriptionUpdater', () => {
    it('should call updateProductDescription API', async () => {
      vi.mocked(api.aiGenerationApi.updateProductDescription).mockResolvedValue({
        ok: true,
      } as any);

      const ctx = createMockContext({
        nodeInputs: { productId: 'p1', description_en: 'New description' },
      });
      const result = await handleDescriptionUpdater(ctx);
      expect(result['description_en']).toBe('New description');
      expect(api.aiGenerationApi.updateProductDescription).toHaveBeenCalledWith(
        'p1',
        'New description'
      );
    });
  });
});
