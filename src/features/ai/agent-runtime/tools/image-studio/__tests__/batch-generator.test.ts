import { describe, it, expect, vi } from 'vitest';
import { runBatchGeneration } from '../batch-generator';
import { createImageStudioRun } from '@/features/ai/image-studio/server';
import { enqueueImageStudioRunJob } from '@/features/ai/image-studio/workers/imageStudioRunQueue';

vi.mock('@/features/ai/image-studio/server', () => ({
  createImageStudioRun: vi.fn(),
}));

vi.mock('@/features/ai/image-studio/workers/imageStudioRunQueue', () => ({
  enqueueImageStudioRunJob: vi.fn(),
}));

describe('BatchImageGenerator', () => {
  it('should queue generation jobs for all provided prompts', async () => {
    vi.mocked(createImageStudioRun).mockResolvedValue({ id: 'run-123' } as any);
    
    const input = {
      projectId: 'proj-1',
      prompts: ['prompt1', 'prompt2'],
      outputCount: 1,
    };

    const result = await runBatchGeneration(input);

    expect(result).toEqual(['run-123', 'run-123']);
    expect(createImageStudioRun).toHaveBeenCalledTimes(2);
    expect(enqueueImageStudioRunJob).toHaveBeenCalledTimes(2);
  });
});
