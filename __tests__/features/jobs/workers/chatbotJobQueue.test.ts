import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    chatbotProcessor: null as ((data: { jobId: string }) => Promise<void>) | null,
  },
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: vi.fn(
    (config: { name: string; processor: (data: { jobId: string }) => Promise<void> }) => {
      if (config.name === 'chatbot') {
        mocks.chatbotProcessor = config.processor;
      }
      return {
        startWorker: vi.fn(),
        stopWorker: vi.fn(),
        enqueue: vi.fn(),
      };
    }
  ),
}));

vi.mock('@/features/ai/chatbot/services/chatbot-job-repository', () => ({
  chatbotJobRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/features/ai/chatbot/workers/chatbot-job-processor', () => ({
  processJob: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForFeature: vi.fn().mockResolvedValue({ enabled: true }),
}));

// Import after mocks
import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { processJob } from '@/features/ai/chatbot/workers/chatbot-job-processor';
import { startChatbotJobQueue } from '@/features/ai/chatbot/workers/chatbotJobQueue';
import { createManagedQueue } from '@/shared/lib/queue';

describe('Chatbot Job Queue Worker', () => {
  beforeEach(() => {
    vi.mocked(chatbotJobRepository.findById).mockClear();
    vi.mocked(chatbotJobRepository.update).mockClear();
    vi.mocked(processJob).mockClear();
  });

  it('starts the worker', async () => {
    startChatbotJobQueue();

    // Check if any instance's startWorker was called (wait for async startup)
    await vi.waitFor(() => {
      const instances = vi.mocked(createManagedQueue).mock.results.map((r) => r.value);
      const startWorkerCalled = instances.some(
        (i: any) => i.startWorker && i.startWorker.mock.calls.length > 0
      );
      if (!startWorkerCalled) throw new Error('Worker not started');
    });
  });

  it('processes a pending job successfully', async () => {
    expect(mocks.chatbotProcessor).toBeDefined();

    const mockJob = {
      id: 'j1',
      status: 'pending',
    };

    vi.mocked(chatbotJobRepository.findById).mockResolvedValue(mockJob as any);
    vi.mocked(chatbotJobRepository.update).mockResolvedValue({
      ...mockJob,
      status: 'running',
    } as any);

    await mocks.chatbotProcessor!({ jobId: 'j1' });

    expect(chatbotJobRepository.findById).toHaveBeenCalledWith('j1');
    expect(chatbotJobRepository.update).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({
        status: 'running',
        startedAt: expect.any(Date),
      })
    );
    expect(processJob).toHaveBeenCalledWith('j1');
  });

  it('skips processing if job is not pending', async () => {
    expect(mocks.chatbotProcessor).toBeDefined();

    const mockJob = {
      id: 'j1',
      status: 'running',
    };

    vi.mocked(chatbotJobRepository.findById).mockResolvedValue(mockJob as any);

    await mocks.chatbotProcessor!({ jobId: 'j1' });

    expect(chatbotJobRepository.update).not.toHaveBeenCalled();
    expect(processJob).not.toHaveBeenCalled();
  });
});
