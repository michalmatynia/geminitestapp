import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    chatbotProcessor: null as any
  }
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: vi.fn((config) => {
    if (config.name === 'chatbot') {
      mocks.chatbotProcessor = config.processor;
    }
    return {
      startWorker: vi.fn(),
      stopWorker: vi.fn(),
      enqueue: vi.fn(),
    };
  }),
}));

vi.mock('@/features/ai/chatbot/services/chatbot-job-repository', () => ({
  chatbotJobRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/features/jobs/processors/chatbot-job-processor', () => ({
  processJob: vi.fn(),
}));

// Import after mocks
import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { processJob } from '@/features/jobs/processors/chatbot-job-processor';
import { startChatbotJobQueue } from '@/features/jobs/workers/chatbotJobQueue';
import { createManagedQueue } from '@/shared/lib/queue';

describe('Chatbot Job Queue Worker', () => {
  beforeEach(() => {
    vi.mocked(chatbotJobRepository.findById).mockClear();
    vi.mocked(chatbotJobRepository.update).mockClear();
    vi.mocked(processJob).mockClear();
  });

  it('starts the worker', () => {
    startChatbotJobQueue();
    // Check if any instance's startWorker was called
    const instances = (createManagedQueue as any).mock.results.map((r: any) => r.value);
    const startWorkerCalled = instances.some((i: any) => i.startWorker && i.startWorker.mock.calls.length > 0);
    expect(startWorkerCalled).toBe(true);
  });

  it('processes a pending job successfully', async () => {
    expect(mocks.chatbotProcessor).toBeDefined();

    const mockJob = {
      id: 'j1',
      status: 'pending',
    };
    
    vi.mocked(chatbotJobRepository.findById).mockResolvedValue(mockJob as any);
    vi.mocked(chatbotJobRepository.update).mockResolvedValue({ ...mockJob, status: 'running' } as any);

    await mocks.chatbotProcessor({ jobId: 'j1' });

    expect(chatbotJobRepository.findById).toHaveBeenCalledWith('j1');
    expect(chatbotJobRepository.update).toHaveBeenCalledWith('j1', expect.objectContaining({ 
      status: 'running',
      startedAt: expect.any(Date)
    }));
    expect(processJob).toHaveBeenCalledWith('j1');
  });

  it('skips processing if job is not pending', async () => {
    expect(mocks.chatbotProcessor).toBeDefined();

    const mockJob = {
      id: 'j1',
      status: 'running',
    };
    
    vi.mocked(chatbotJobRepository.findById).mockResolvedValue(mockJob as any);

    await mocks.chatbotProcessor({ jobId: 'j1' });

    expect(chatbotJobRepository.update).not.toHaveBeenCalled();
    expect(processJob).not.toHaveBeenCalled();
  });
});