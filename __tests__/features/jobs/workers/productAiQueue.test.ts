import OpenAI from 'openai';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ErrorSystem } from '@/features/observability/server';
import { generateProductDescription, translateProduct, getProductRepository } from '@/features/products/server';
import { getProductAiJobRepository } from '@/features/jobs/services/product-ai-job-repository';
import { resetProductAiJobQueue } from '@/features/jobs/workers/productAiQueue';

vi.mock('openai');

describe('Product AI Job Queue Worker', () => {
  let mockPollQueue: any;

  const mockJobRepo = {
    markStaleRunningJobs: vi.fn().mockResolvedValue({ count: 0 }),
    claimNextPendingJob: vi.fn(),
    findAnyPendingJob: vi.fn().mockResolvedValue(null),
    updateJob: vi.fn(),
  };

  const mockProductRepo = {
    getProductById: vi.fn(),
    updateProduct: vi.fn(),
  };

  const mockOpenAI = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    mockPollQueue = vi.fn(); // Assign here
    vi.clearAllMocks();
    mockJobRepo.markStaleRunningJobs.mockClear();
    mockJobRepo.claimNextPendingJob.mockClear();
    mockJobRepo.findAnyPendingJob.mockClear();
    mockJobRepo.updateJob.mockClear();
    mockProductRepo.getProductById.mockClear();
    mockProductRepo.updateProduct.mockClear();
    mockOpenAI.chat.completions.create.mockClear();
    vi.mocked(generateProductDescription).mockClear();
    vi.mocked(translateProduct).mockClear();
    vi.mocked(ErrorSystem.captureException).mockClear();

    resetProductAiJobQueue();
    vi.mocked(getProductAiJobRepository).mockResolvedValue(mockJobRepo as any);
    vi.mocked(getProductRepository).mockResolvedValue(mockProductRepo as any);
    vi.mocked(OpenAI).mockImplementation(() => mockOpenAI as any);
  });

  describe('pollQueue', () => {
    it('processes a description generation job', async () => {
      const mockJob = {
        id: 'job-1',
        type: 'description_generation',
        status: 'pending',
        productId: 'p1',
        payload: { isTest: false },
        createdAt: new Date(),
      };
      mockJobRepo.claimNextPendingJob.mockResolvedValue(mockJob);
      
      const mockProduct = { id: 'p1', name_en: 'Product 1', images: [], imageLinks: [] };
      mockProductRepo.getProductById.mockResolvedValue(mockProduct);
      
      vi.mocked(generateProductDescription).mockResolvedValue({ description: 'New Description' } as any);

      await mockPollQueue();

      expect(mockJobRepo.claimNextPendingJob).toHaveBeenCalled();
      expect(generateProductDescription).toHaveBeenCalled();
      expect(mockProductRepo.updateProduct).toHaveBeenCalledWith('p1', { description_en: 'New Description' });
      expect(mockJobRepo.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({ status: 'completed' }));
      expect(mockPollQueue).toHaveBeenCalledOnce();
    });

    it('processes a translation job', async () => {
      const mockJob = {
        id: 'job-2',
        type: 'translation',
        status: 'pending',
        productId: 'p2',
        payload: {},
        createdAt: new Date(),
      };
      mockJobRepo.claimNextPendingJob.mockResolvedValue(mockJob);
      
      const mockProduct = { id: 'p2', name_en: 'Name EN', description_en: 'Desc EN', catalogs: [] };
      mockProductRepo.getProductById.mockResolvedValue(mockProduct);
      
      vi.mocked(translateProduct).mockResolvedValue({ 
        translations: { 
          'Polish': { name: 'Name PL', description: 'Desc PL' } 
        } 
      } as any);

      await mockPollQueue();

      expect(translateProduct).toHaveBeenCalled();
      expect(mockProductRepo.updateProduct).toHaveBeenCalledWith('p2', expect.objectContaining({ name_pl: 'Name PL' }));
      expect(mockJobRepo.updateJob).toHaveBeenCalledWith('job-2', expect.objectContaining({ status: 'completed' }));
      expect(mockPollQueue).toHaveBeenCalledOnce();
    });

    it('processes a graph_model job', async () => {
      const mockJob = {
        id: 'job-4',
        type: 'graph_model',
        status: 'pending',
        productId: 'p4',
        payload: { prompt: 'Tell me a joke', vision: false },
        createdAt: new Date(),
      };
      mockJobRepo.claimNextPendingJob.mockResolvedValue(mockJob);
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Haha' } }],
      });

      await mockPollQueue();

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(mockJobRepo.updateJob).toHaveBeenCalledWith('job-4', expect.objectContaining({ 
        status: 'completed',
        result: expect.objectContaining({ result: 'Haha' })
      }));
      expect(mockPollQueue).toHaveBeenCalledOnce();
    });

    it('handles errors and captures exception', async () => {
      const mockJob = {
        id: 'job-3',
        type: 'description_generation',
        status: 'pending',
        productId: 'p3',
        payload: {},
        createdAt: new Date(),
      };
      mockJobRepo.claimNextPendingJob.mockResolvedValue(mockJob);
      mockProductRepo.getProductById.mockRejectedValue(new Error('DB Error'));

      await mockPollQueue();

      expect(ErrorSystem.captureException).toHaveBeenCalled();
      expect(mockJobRepo.updateJob).toHaveBeenCalledWith('job-3', expect.objectContaining({ 
        status: 'failed',
        errorMessage: 'DB Error'
      }));
      expect(mockPollQueue).toHaveBeenCalledOnce();
    });
  });
});