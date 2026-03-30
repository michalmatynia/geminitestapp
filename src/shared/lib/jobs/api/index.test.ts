import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const putMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: getMock,
    post: postMock,
    put: putMock,
    delete: deleteMock,
  },
}));

import {
  cancelJob,
  cancelListing,
  clearChatbotJobs,
  clearProductAiJobs,
  deleteChatbotJob,
  deleteProductAiJob,
  getChatbotJobs,
  getIntegrationJobs,
  getJobStatus,
  getJobStatusDetail,
  getProductAiJob,
  getProductAiJobs,
  getTraderaQueueHealth,
  performProductAiJobAction,
  updateChatbotJob,
  updateProductAiJob,
} from '@/shared/lib/jobs/api';

describe('jobs api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ ok: true });
    postMock.mockResolvedValue({ ok: true });
    putMock.mockResolvedValue({ ok: true });
    deleteMock.mockResolvedValue({ ok: true });
  });

  it('calls the expected endpoints for read operations', async () => {
    await getIntegrationJobs();
    await getProductAiJobs();
    await getProductAiJobs('failed');
    await getProductAiJob('job-1');
    await getChatbotJobs();
    await getChatbotJobs('running');
    await getJobStatus();
    await getJobStatusDetail('job-2');
    await getTraderaQueueHealth();

    expect(getMock).toHaveBeenNthCalledWith(1, '/api/v2/integrations/jobs');
    expect(getMock).toHaveBeenNthCalledWith(2, '/api/v2/products/ai-jobs', {
      params: { scope: 'all' },
    });
    expect(getMock).toHaveBeenNthCalledWith(3, '/api/v2/products/ai-jobs', {
      params: { scope: 'failed' },
    });
    expect(getMock).toHaveBeenNthCalledWith(4, '/api/v2/products/ai-jobs/job-1');
    expect(getMock).toHaveBeenNthCalledWith(5, '/api/chatbot/jobs', {
      params: { scope: 'all' },
    });
    expect(getMock).toHaveBeenNthCalledWith(6, '/api/chatbot/jobs', {
      params: { scope: 'running' },
    });
    expect(getMock).toHaveBeenNthCalledWith(7, '/api/jobs/status');
    expect(getMock).toHaveBeenNthCalledWith(8, '/api/jobs/job-2/status');
    expect(getMock).toHaveBeenNthCalledWith(9, '/api/v2/integrations/queues/tradera');
  });

  it('calls the expected endpoints for mutations and delete helpers', async () => {
    await performProductAiJobAction('job-1', 'retry');
    await updateProductAiJob('job-2', { status: 'running' });
    await clearProductAiJobs();
    await clearProductAiJobs('failed');
    await updateChatbotJob('chat-1', 'cancel');
    await deleteProductAiJob('job-3');
    await deleteChatbotJob('chat-2');
    await deleteChatbotJob('chat-3', true);
    await clearChatbotJobs();
    await clearChatbotJobs('stale');
    await cancelListing('product-1', 'listing-1');
    await cancelJob('job-4');

    expect(postMock).toHaveBeenNthCalledWith(1, '/api/v2/products/ai-jobs/job-1', {
      action: 'retry',
    });
    expect(putMock).toHaveBeenCalledWith('/api/v2/products/ai-jobs/job-2', {
      status: 'running',
    });
    expect(deleteMock).toHaveBeenNthCalledWith(1, '/api/v2/products/ai-jobs', {
      params: { scope: 'all' },
    });
    expect(deleteMock).toHaveBeenNthCalledWith(2, '/api/v2/products/ai-jobs', {
      params: { scope: 'failed' },
    });
    expect(postMock).toHaveBeenNthCalledWith(2, '/api/chatbot/jobs/chat-1', {
      action: 'cancel',
    });
    expect(deleteMock).toHaveBeenNthCalledWith(3, '/api/v2/products/ai-jobs/job-3');
    expect(deleteMock).toHaveBeenNthCalledWith(4, '/api/chatbot/jobs/chat-2', {});
    expect(deleteMock).toHaveBeenNthCalledWith(5, '/api/chatbot/jobs/chat-3', {
      params: { force: 'true' },
    });
    expect(deleteMock).toHaveBeenNthCalledWith(6, '/api/chatbot/jobs', {
      params: { scope: 'all' },
    });
    expect(deleteMock).toHaveBeenNthCalledWith(7, '/api/chatbot/jobs', {
      params: { scope: 'stale' },
    });
    expect(deleteMock).toHaveBeenNthCalledWith(
      8,
      '/api/v2/integrations/products/product-1/listings/listing-1'
    );
    expect(postMock).toHaveBeenNthCalledWith(3, '/api/jobs/job-4/cancel');
  });
});
