import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

import * as api from '@/shared/lib/ai-paths/api';
import {
  handleTemplate,
  handlePrompt,
  handleModel,
} from '@/shared/lib/ai-paths/core/runtime/handlers/generation';

import { createMockContext } from '../test-utils';

vi.mock('@/shared/lib/ai-paths/api', () => ({
  aiJobsApi: {
    enqueue: vi.fn(),
    poll: vi.fn(),
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

    it('reuses previous outputs when the payload hash matches an already queued job', async () => {
      vi.mocked(api.aiJobsApi.enqueue).mockReset();
      vi.mocked(api.aiJobsApi.enqueue).mockResolvedValueOnce({
        ok: true,
        data: { jobId: 'job-existing' },
      } as any);

      const baseContext = {
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: { prompt: 'Reuse this payload' },
        runStartedAt: '2026-03-27T00:00:00.000Z',
        now: '2026-03-27T00:00:00.000Z',
      };

      const first = await handleModel(createMockContext(baseContext));
      vi.mocked(api.aiJobsApi.enqueue).mockImplementation(() => {
        throw new Error('should not enqueue duplicate payload');
      });
      const second = await handleModel(
        createMockContext({
          ...baseContext,
          prevOutputs: first,
        })
      );

      expect(first['jobId']).toBe('job-existing');
      expect(second).toEqual(first);
      expect(api.aiJobsApi.enqueue).toHaveBeenCalledTimes(1);
    });

    it('returns blocked status when the resolved prompt is blank', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: { prompt: '—' },
      });

      const result = await handleModel(ctx);
      expect(result['status']).toBe('blocked');
      expect(result['skipReason']).toBe('empty_prompt');
      expect(result['blockedReason']).toBe('empty_prompt');
      expect(api.aiJobsApi.enqueue).not.toHaveBeenCalled();
    });

    it('returns failed status for non-retryable enqueue errors and reports them', async () => {
      vi.mocked(api.aiJobsApi.enqueue).mockResolvedValueOnce({
        ok: false,
        error: 'Validation rejected the request',
      } as any);
      const reportAiPathsError = vi.fn();
      const toast = vi.fn();

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: { prompt: 'Do something' },
        reportAiPathsError,
        toast,
      });

      const result = await handleModel(ctx);
      expect(result['status']).toBe('failed');
      expect(result['error']).toBe('Validation rejected the request');
      expect(reportAiPathsError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ action: 'graphModel', nodeId: 'n1' }),
        'AI model job failed:'
      );
      expect(toast).toHaveBeenCalledWith('Validation rejected the request', {
        variant: 'error',
        error: expect.any(Error),
      });
    });

    it('surfaces model-selection guidance and rethrows hard timeout failures', async () => {
      vi.mocked(api.aiJobsApi.enqueue)
        .mockResolvedValueOnce({
          ok: false,
          error: 'Model node did not select any model',
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          error: 'AI job timed out after 15 attempts',
        } as any);

      const toastMissingModel = vi.fn();
      const reportMissingModel = vi.fn();
      const missingModelCtx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: { prompt: 'Do something' },
        reportAiPathsError: reportMissingModel,
        toast: toastMissingModel,
      });

      const missingModelResult = await handleModel(missingModelCtx);
      expect(missingModelResult['status']).toBe('failed');
      expect(toastMissingModel).toHaveBeenCalledWith(
        'No AI model configured: Select a model on the Model node in your AI Path.',
        { variant: 'error', error: expect.any(Error) }
      );

      const toastHardFailure = vi.fn();
      const reportHardFailure = vi.fn();
      const hardFailureCtx = createMockContext({
        node: {
          id: 'n1',
          type: 'model',
          inputs: ['prompt'],
          config: { model: { modelId: 'gpt-4o', waitForResult: false } },
        } as any,
        nodeInputs: { prompt: 'Do something else' },
        reportAiPathsError: reportHardFailure,
        toast: toastHardFailure,
      });

      await expect(handleModel(hardFailureCtx)).rejects.toThrow('AI job timed out after 15 attempts');
      expect(reportHardFailure).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ action: 'graphModel', nodeId: 'n1' }),
        'AI model job failed:'
      );
    });
  });

});
